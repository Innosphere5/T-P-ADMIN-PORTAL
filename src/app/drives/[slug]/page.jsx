import { getPlacementDrives } from '@/lib/db';
import DriveRegistrationClient from './DriveRegistrationClient';

export const dynamic = 'force-dynamic';

export default async function DrivePage({ params }) {
  const { slug } = await Promise.resolve(params);

  let drive = null;
  try {
    const drives = await getPlacementDrives();
    drive = drives.find(
      (d) => d.slug === slug || d.id === slug
    );
  } catch (_) {}

  // If drive not found or unpublished draft
  if (!drive) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-slate-800/80 border border-slate-700/60 rounded-2xl p-8 text-center backdrop-blur-md shadow-2xl">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#6B0018] to-[#990024] flex items-center justify-center text-white font-black text-xl mx-auto mb-4">
            R
          </div>
          <h1 className="text-xl font-extrabold text-white mb-2">Drive Not Found</h1>
          <p className="text-xs text-slate-400 leading-relaxed mb-6">
            This placement drive or event registration link could not be located. It may have expired, or the link may be incorrect.
          </p>
          <a
            href="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-[#6B0018] hover:bg-[#85001F] text-white text-xs font-bold transition"
          >
            ← Back to University Home
          </a>
        </div>
      </div>
    );
  }

  const customSchema = drive.customForm || drive.formSchema || [];

  return (
    <DriveRegistrationClient
      drive={drive}
      initialSchema={customSchema}
    />
  );
}
