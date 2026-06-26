import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { RolesGuard } from '../auth/guards/roles.guard';
export type IUser = {
  id: string;
  name: string;
  email: string;
  role: 'USER';
  createdAt: string;
  updatedAt: string;
};
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Get('/admin')
  getAdmin() {
    return 'admin only';
  }
}
