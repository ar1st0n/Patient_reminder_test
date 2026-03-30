import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  CreateQueueCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import {
  EventBridgeClient,
  PutRuleCommand,
  PutTargetsCommand,
} from '@aws-sdk/client-eventbridge';
import { CalendarService } from '../calendar/calendar.service';

@Injectable()
export class SQSListenerService implements OnModuleInit {
  private sqsClient: SQSClient;
  private ebClient: EventBridgeClient;
  private queueUrl: string | undefined;

  constructor(private readonly calendarService: CalendarService) {
    const config = {
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localstack:4566',
    };
    this.sqsClient = new SQSClient(config);
    this.ebClient = new EventBridgeClient(config);
  }

  async onModuleInit() {
    await this.setupInfrastructure();
    this.poll();
  }

  private async setupInfrastructure() {
    try {
      // Create Queue
      const qName = 'takecare-events';
      await this.sqsClient.send(new CreateQueueCommand({ QueueName: qName }));
      const { QueueUrl } = await this.sqsClient.send(new GetQueueUrlCommand({ QueueName: qName }));
      this.queueUrl = QueueUrl;

      const qArn = `arn:aws:sqs:us-east-1:000000000000:${qName}`;

      // Create EventBridge Rule
      await this.ebClient.send(new PutRuleCommand({
        Name: 'WorkflowRule',
        EventPattern: JSON.stringify({ source: ['takecare.core-api'] }),
        State: 'ENABLED',
      }));

      // Set SQS as Target
      await this.ebClient.send(new PutTargetsCommand({
        Rule: 'WorkflowRule',
        Targets: [{ Id: '1', Arn: qArn }],
      }));

      console.log('Infrastructure setup complete. QueueUrl:', this.queueUrl);
    } catch (e) {
      console.error('Error setting up infrastructure:', e);
    }
  }

  private async poll() {
    if (!this.queueUrl) {
      setTimeout(() => this.poll(), 5000);
      return;
    }

    try {
      const { Messages } = await this.sqsClient.send(new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 20,
      }));

      if (Messages) {
        for (const msg of Messages) {
          await this.handleMessage(msg);
          await this.sqsClient.send(new DeleteMessageCommand({
            QueueUrl: this.queueUrl,
            ReceiptHandle: msg.ReceiptHandle,
          }));
        }
      }
    } catch (e) {
      console.error('Error polling SQS:', e);
    } finally {
      setTimeout(() => this.poll(), 100);
    }
  }

  private async handleMessage(msg: any) {
    try {
      const body = JSON.parse(msg.Body);
      const detail = JSON.parse(body.Detail);
      const detailType = body['detail-type'];

      console.log('Received event:', detailType, detail);

      if (detailType === 'PrescriptionConfirmed') {
        if (detail.syncToCalendar) {
          await this.calendarService.syncPrescriptionToCalendar(detail.userId, detail.prescriptionId);
        }
      } else if (detailType === 'FamilyExportRequested') {
        await this.calendarService.exportToFamilyCalendar(detail.familyUserId, detail.patientUserId, detail.prescriptionId);
      }
    } catch (e) {
      console.error('Error handling message:', e);
    }
  }
}
