import { Link } from 'react-router-dom'
import { UserRound } from 'lucide-react'
import { AuthCard, AuthDivider, AuthFootnote, AuthHeading, AuthTabs, TextLink } from '../../components/auth/AuthCard'
import SignInForm from '../../components/auth/SignInForm'
import SignedInRedirect from '../../components/auth/SignedInRedirect'

export default function SignIn() {
  return (
    <SignedInRedirect>
      <AuthCard>
        <AuthTabs active="sign-in" />
        <AuthHeading title="Welcome back" subtitle="Your sessions and projects are right where you left them." />
        <SignInForm />
        <AuthDivider>No personal email?</AuthDivider>
        <Link
          to="/alias"
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/[0.08] bg-white/50 text-sm font-medium text-gray-600 backdrop-blur-sm transition-all duration-150 hover:-translate-y-px hover:bg-white/80 active:scale-[0.98]"
        >
          <UserRound className="h-4 w-4 text-gray-400" strokeWidth={1.75} aria-hidden="true" />
          Sign in with a student alias
        </Link>
        <AuthFootnote>
          New to The Builders? <TextLink to="/sign-up">Create an account</TextLink>
        </AuthFootnote>
      </AuthCard>
    </SignedInRedirect>
  )
}
