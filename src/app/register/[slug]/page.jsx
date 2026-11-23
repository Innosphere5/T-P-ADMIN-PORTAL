import { getEventBySlug } from '@/lib/driveClient';
import EventRegistrationClient from './EventRegistrationClient';

/**
 * Public Event Registration Page — /register/[slug]
 * Server component that pre-fetches event data directly from Supabase during SSR.
 * The entire registration form is delivered in the initial HTML payload with ZERO spinner delay.
 */
export default async function PublicEventRegistrationPage({ params }) {
  const resolvedParams = await params;
  const slug = resolvedParams?.slug || '';
  const event = await getEventBySlug(slug);

  return <EventRegistrationClient initialEvent={event} slug={slug} />;
}
