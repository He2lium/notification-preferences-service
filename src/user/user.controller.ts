import { Body, Controller, Delete, Get, Param, Put } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from './dto/response/user-response.dto';
import { UserIdDto } from '@global/dto/user-id.dto';
import { UserCreateDto } from './dto/create/user-create.dto';

@Controller('user')
@ApiTags('user')
export class UserController {
  constructor(private _userService: UserService) {}

  @Get(':user_id')
  @ApiOperation({ summary: 'Get user by id' })
  @ApiOkResponse({ type: UserResponseDto })
  getById(@Param() { user_id }: UserIdDto) {
    return this._userService.getById(user_id);
  }

  @Put()
  @ApiOperation({ summary: 'Upsert user' })
  @ApiOkResponse({ type: UserResponseDto })
  upsertUser(@Body() data: UserCreateDto) {
    return this._userService.upsert(data);
  }

  @Delete(':user_id')
  @ApiOperation({ summary: 'Delete user by id' })
  @ApiOkResponse({ type: UserResponseDto })
  deleteById(@Param() { user_id }: UserIdDto) {
    return this._userService.delete(user_id);
  }
}
