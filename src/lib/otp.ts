import bcrypt from 'bcryptjs'

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export async function hashOTP(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

export async function verifyOTP(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash)
}
