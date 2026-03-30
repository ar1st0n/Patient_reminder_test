import { Body, Controller, Post } from '@nestjs/common';

@Controller('/dev')
export class DevController {
  @Post('/event')
  event(@Body() body: unknown) {
    return { ok: true, received: body };
  }
}
