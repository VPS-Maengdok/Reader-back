import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from 'src/guards/auth.guard';
import { UserService } from 'src/services/user.service';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(AuthGuard)
  @Get()
  async getUsers() {
    return this.userService.findAll();
  }

  @Get(':id')
  async getUser(@Param('id', ParseIntPipe) id: number) {
    return this.userService.findOne(id);
  }
}
