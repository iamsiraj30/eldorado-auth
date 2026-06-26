import { Controller } from '@nestjs/common';
import { UserService } from './user.service';
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
}
