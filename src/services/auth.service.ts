import {repository} from '@loopback/repository';
import {generate as generator} from 'generate-password';
import {Keys} from '../keys/keys';
import {PasswordKeys as passKeys} from '../keys/password-keys';
import {User} from '../models';
import {UserRepository} from '../repositories';
import {Encryption} from './encryption.service';
const jwt = require('jsonwebtoken');

export class AuthService {
  constructor(
    @repository(UserRepository)
    public userRepository: UserRepository,
  ) {}

  /**
   *
   * @param username
   * @param password
   */
  async identify(email: string, password: string): Promise<User | false> {
    let user = await this.userRepository.findOne({where: {email: email}});
    if (user) {
      let pass = new Encryption(Keys.SHA_512).Encrypt(password);
      if (pass === user.password) {
        return user;
      }
    }
    return false;
  }

  async VerifyUserToChangePassword(id: string, userPassword: string): Promise<User | false> {
    let user = await this.userRepository.findById(id);
    if (user) {
      let pass = new Encryption(Keys.SHA_512).Encrypt(userPassword);
      if (pass === user.password) {
        return user;
      }
    }
    return false;
  }

  async ChangePassword(user: User, newPassword: string): Promise<boolean> {
    try {
      let pass = new Encryption(Keys.SHA_512).Encrypt(newPassword);
      user.password = pass;
      await this.userRepository.updateById(user.id, user);
      return true;
    } catch (_) {
      return false;
    }
  }
  /**
   *
   * @param user
   */
  async generateToken(user: User): Promise<String> {
    user.password = '';
    let token = jwt.sign(
      {
        exp: Keys.TOKEN_EXP,
        data: {
          id: user.id,
          username: user.firstName,
          role: user.role,
        },
      },
      Keys.JWT_SECRET_KEY,
    );
    return token;
  }
  /**
   * To verify a given token
   * @param token
   */
  async VerifyToken(token: string) {
    try {
      let data = jwt.verify(token, Keys.JWT_SECRET_KEY).data;
      return data;
    } catch (error) {
      return false;
    }
  }
  /**
   * Reset the password when its missed
   */
  async ResetPassword(email: string): Promise<string | false> {
    console.log(email);
    let user = await this.userRepository.findOne({where: {email: email}});
    if (user) {
      let randomPassword = await generator({
        length: passKeys.LENGTH,
        numbers: passKeys.NUMBERS,
        lowercase: passKeys.LOWERCASE,
        uppercase: passKeys.UPPERCASE,
      });
      let crypter = new Encryption(Keys.SHA_512);
      let password = crypter.Encrypt(crypter.Encrypt(randomPassword));
      user.password = password;
      this.userRepository.replaceById(user.id, user);
      return randomPassword;
    }
    return false;
  }
}
