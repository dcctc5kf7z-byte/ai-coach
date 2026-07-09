import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Coach - 登录/注册',
  description: '登录或注册AI Coach账号',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
