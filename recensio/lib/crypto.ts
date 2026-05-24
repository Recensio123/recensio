import crypto from 'crypto'

const key = () => Buffer.from(process.env.ENCRYPTION_KEY!, 'hex')

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key(), iv)
  const encrypted = Buffer.concat([cipher.update(text), cipher.final()])
  return iv.toString('hex') + ':' + encrypted.toString('hex')
}

export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':')
  const decipher = crypto.createDecipheriv(
    'aes-256-cbc',
    key(),
    Buffer.from(ivHex, 'hex')
  )
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedHex, 'hex')),
    decipher.final(),
  ]).toString()
}

export function hashIp(ip: string): string {
  return crypto.createHash('sha256').update(ip).digest('hex')
}
