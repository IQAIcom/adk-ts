import { ImageResponse } from 'next/og';
import { source } from '@/lib/source';
import { notFound } from 'next/navigation';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string[] }> },
) {
  const { slug } = await params;
  const page = source.getPage(slug.slice(0, -1));
  if (!page) notFound();

  const { title, description } = page.data;

  const url = new URL(req.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: '#202A36',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background Pattern using your actual bg.svg */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${baseUrl}/bg.svg)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            opacity: 0.3,
          }}
        />

        {/* Main Content Container */}
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 80px',
            marginBottom: '90px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {/* Left Side - Branding */}
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '24px',
            }}
          >
            {/* Logo Section */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '24px',
              }}
            >
              <div
                style={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img
                  src={`${baseUrl}/adk.png`}
                  alt="ADK Logo"
                  width="210"
                  height="180"
                />
              </div>
            </div>

            {/* Text Branding */}
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                fontSize: '48px',
                fontWeight: 'bold',
                color: 'white',
                width: '40px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: 1.1,
              }}
            >
              <span
              >
                Agent Development Kit
              </span>
              <span
                style={{
                  background: '#3b82f6',
                  padding: '6px 12px',
                  width: '256px',
                  transform: 'rotate(-6deg) translateY(-25px) translateX(-80px)',
                }}
              >
                TypeScript
              </span>
            </div>
          </div>

          {/* Right Side - Page Content */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              textAlign: 'right',
              maxWidth: '480px',
            }}
          >
            <div
              style={{
                fontSize: '68px',
                fontWeight: 'bold',
                color: 'white',
                marginBottom: '16px',
                fontFamily: 'system-ui, -apple-system, sans-serif',
                lineHeight: 1.1,
              }}
            >
              {title}
            </div>
            {description && (
              <div
                style={{
                  fontSize: '28px',
                  color: '#cbd5e1',
                  lineHeight: 1.4,
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                }}
              >
                {description.length > 120 ? description.slice(0, 120) + '...' : description}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Powered by IQ */}
        <div
          style={{
            position: 'absolute',
            bottom: '0px',
            width: '100%',
            height: '90px',
            borderTop: '4px solid #FF5BAA',
            background: '#18202C',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '12px',
            zIndex: 2,
            fontSize: '36px',
            fontWeight: 'extrabold',
            color: '#e2e8f0',
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          <span>
            Powered by
          </span>
          <img
            src={`${baseUrl}/iqai.png`}
            alt="IQ Logo"
            width="40"
            height="36"
          />
          <span>
            IQ
          </span>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}

export function generateStaticParams() {
  return source.generateParams().map((page) => ({
    ...page,
    slug: [...page.slug, 'image.png'],
  }));
}