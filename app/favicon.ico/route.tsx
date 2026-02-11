import { ImageResponse } from 'next/og'

// Edge required for next/og ImageResponse; Vercel warning about static generation is expected
export const runtime = 'edge'

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#1e3a5f',
          borderRadius: 6,
          fontSize: 18,
          fontWeight: 700,
          color: '#E0D8D0',
        }}
      >
        ف
      </div>
    ),
    { width: 32, height: 32 }
  )
}
