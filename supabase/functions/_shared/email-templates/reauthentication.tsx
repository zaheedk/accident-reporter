/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({ token }: ReauthenticationEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Savo verification code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={header}>
          <Heading style={logoText}>Savo</Heading>
        </Section>
        <Section style={content}>
          <Heading style={h1}>Verification code</Heading>
          <Text style={text}>Use the code below to verify your identity:</Text>
          <Text style={codeStyle}>{token}</Text>
          <Text style={footer}>
            This code expires in 10 minutes. If you didn't request this, ignore this email.
          </Text>
        </Section>
        <Text style={brand}>© 2025 Savo · Auckland, New Zealand</Text>
      </Container>
    </Body>
  </Html>
)

export default ReauthenticationEmail

const main = { backgroundColor: '#f5f5f5', fontFamily: "Arial, sans-serif" }
const container = { maxWidth: '600px', margin: '0 auto', padding: '20px' }
const header = { backgroundColor: '#1e3a5f', padding: '30px', borderRadius: '12px 12px 0 0', textAlign: 'center' as const }
const logoText = { color: '#ffffff', fontSize: '28px', fontWeight: '700' as const, margin: '0', letterSpacing: '-0.5px' }
const content = { backgroundColor: '#ffffff', padding: '30px', border: '1px solid #e5e5e5', borderTop: 'none', borderRadius: '0 0 12px 12px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#1a1a1a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#555555', lineHeight: '1.6', margin: '0 0 16px' }
const codeStyle = {
  fontFamily: 'Courier, monospace',
  fontSize: '32px',
  fontWeight: 'bold' as const,
  color: '#1e3a5f',
  letterSpacing: '6px',
  textAlign: 'center' as const,
  backgroundColor: '#f5f5f5',
  border: '2px solid #e5e5e5',
  borderRadius: '12px',
  padding: '16px 24px',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '20px 0 0' }
const brand = { fontSize: '11px', color: '#bbbbbb', textAlign: 'center' as const, margin: '16px 0 0' }
