import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'AI Coach - 成长教练',
  description: 'AI理性成长教练Web应用',
}

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
