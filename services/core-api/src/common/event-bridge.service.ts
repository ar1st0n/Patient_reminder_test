import { Injectable } from '@nestjs/common';
import {
  EventBridgeClient,
  PutEventsCommand,
} from '@aws-sdk/client-eventbridge';

@Injectable()
export class EventBridgeService {
  private client: EventBridgeClient;

  constructor() {
    this.client = new EventBridgeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
      endpoint: process.env.AWS_ENDPOINT_URL || 'http://localstack:4566',
    });
  }

  async publish(source: string, detailType: string, detail: any) {
    const command = new PutEventsCommand({
      Entries: [
        {
          Source: source,
          DetailType: detailType,
          Detail: JSON.stringify(detail),
          EventBusName: 'default',
        },
      ],
    });

    try {
      const response = await this.client.send(command);
      console.log('Event published:', response);
      return response;
    } catch (error) {
      console.error('Error publishing event:', error);
      throw error;
    }
  }
}
