import { noIndexMetadata } from '@/lib/seo/metadata';
import RegisterForm from './register-form';

export const metadata = noIndexMetadata('Create Account');

export default function RegisterPage() {
  return <RegisterForm />;
}
