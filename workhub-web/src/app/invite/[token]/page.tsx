import { notFound } from "next/navigation";

import {
  getInvitationAcceptanceData,
  ProfileError,
} from "@/modules/profile/services/profile-service";
import { AcceptInvitationForm } from "./accept-invitation-form";

export const metadata = {
  title: "Accept Invitation | WorkHub",
};

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = await getInvitationAcceptanceData(token).catch((error) => {
    if (error instanceof ProfileError && error.code === "invite_invalid") {
      notFound();
    }
    throw error;
  });

  return (
    <section className="mx-auto flex w-full max-w-7xl items-center justify-center px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-700">
            Invitation
          </p>
          <h1 className="mt-3 text-2xl font-semibold text-slate-950">
            Join {invitation.organizationName}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            This invite is for {invitation.email} and expires on{" "}
            {formatDate(invitation.expiresAt)}.
          </p>
        </div>
        <AcceptInvitationForm token={token} />
      </div>
    </section>
  );
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(value);
}
