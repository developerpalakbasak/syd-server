import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { QuotesService } from './quotes.service.js';
import { GetQuotesDto } from './dto/get-quotes.dto.js';

@Controller('quotes')
export class QuotesController {
  constructor(private readonly quotesService: QuotesService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async getQuotes(@Body() dto: GetQuotesDto) {
    return this.quotesService.calculateQuotes(dto);
  }
}
