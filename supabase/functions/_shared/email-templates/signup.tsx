/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for Savo</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logoText}>Savo</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Confirm your email</Heading>
          <Text style={text}>
            Welcome to <strong>Savo</strong> — your vehicle claims assistant!
          </Text>
          <Text style={text}>
            Please verify your email address ({recipient}) by clicking the button below:
          </Text>
          <Button style={button} href={confirmationUrl}>
            Verify Email Address
          </Button>
          <Text style={footer}>
            If you didn't create a Savo account, you can safely ignore this email.
          </Text>
        </Section>
        <Text style={brand}>© 2025 Savo · Auckland, New Zealand</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#f5f5f5', fontFamily: "Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '20px' }
const header = { backgroundColor: '#e8551e', padding: '30px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '28px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const content = { backgroundColor: '#ffffff', padding: '30px', border: '1px solid #e5e5e5', borderTop: 'none', borderRadius: '0 0 12px 12px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 16px' }
const button = { backgroundColor: '#e8551e', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '8px', padding: '14px 28px', textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
const brand = { fontSize: '11px', color: '#bbbbbb', textAlign: 'center' as const, margin: '16px 0 0' }
