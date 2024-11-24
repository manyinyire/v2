import { Metadata } from 'next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Account Inactive - Escalated Query Management System',
  description: 'Your account has been deactivated',
}

export default function InactiveAccountPage() {
  return (
    <div className="container flex h-screen w-full flex-col items-center justify-center">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Account Inactive</CardTitle>
          <CardDescription>
            Your account has been deactivated
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <div className="rounded-full bg-red-100 p-3 w-16 h-16 mx-auto flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-8 w-8 text-red-600"
            >
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>
          <p className="text-muted-foreground">
            Your account has been deactivated by an administrator.
            If you believe this is a mistake, please contact support for assistance.
          </p>
          <p className="text-sm text-muted-foreground">
            For security reasons, you will not be able to access your account until it has been reactivated.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center space-x-4">
          <Button asChild variant="outline">
            <Link href="/login">Return to Login</Link>
          </Button>
          <Button asChild>
            <a href="mailto:support@outrisk.co.zw">Contact Support</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
