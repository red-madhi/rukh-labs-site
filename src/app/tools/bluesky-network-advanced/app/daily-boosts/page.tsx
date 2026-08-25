import type { Metadata } from "next";
import Link from "next/link";
import { AdvancedNetworkAccessGate } from "@/components/tools/advanced-network-access-gate";
import { buttonStyles } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Container } from "@/components/ui/container";
import { Section } from "@/components/ui/section";
import { hasAdvancedNetworkAccess } from "@/lib/advanced-network-access";
import {
  dailyBoostPostUrl,
  getDailyBoostRunByToken,
  getLatestDailyBoostRun,
  type DailyBoostItem,
} from "@/lib/advanced-network-daily-boosts";

export const metadata: Metadata = {
  title: "Daily Boosts | IAZMA PRO",
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
};

function slotLabel(slot: DailyBoostItem["slot"]) {
  if (slot === "mutual") return "Strong mutual";
  if (slot === "target") return "Target";
  return "Bridge";
}

type PageProps = {
  searchParams: Promise<{
    token?: string;
    approved?: string;
    skipped?: string;
    error?: string;
  }>;
};

export default async function DailyBoostsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const token = typeof params.token === "string" ? params.token : "";
  const tokenRun = token ? await getDailyBoostRunByToken(token) : null;
  const authorized = tokenRun ? true : await hasAdvancedNetworkAccess();

  if (!authorized) {
    return (
      <Section className="overflow-x-clip py-12 sm:py-16">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <AdvancedNetworkAccessGate />
        </Container>
      </Section>
    );
  }

  const run = tokenRun ?? (await getLatestDailyBoostRun());
  const actionToken = token || run?.token || "";

  return (
    <>
      <Section className="relative overflow-x-clip border-b border-white/10 py-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(22,200,255,0.11),transparent_34%)]" />
        <Container className="relative min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          <Link
            href="/tools/bluesky-network-advanced/app"
            className={buttonStyles({ variant: "ghost", size: "sm", className: "px-0" })}
          >
            ← IAZMA PRO
          </Link>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
            IAZMA PRO · Daily Boosts
          </p>
          <h1 className="mt-3 max-w-4xl text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
            Three useful reposts. One approval.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-white/54">
            IAZMA picks one strong mutual, one active target, and one bridge account. Nothing is reposted just by opening this page.
          </p>
        </Container>
      </Section>

      <Section className="overflow-x-clip py-10 sm:py-14">
        <Container className="min-w-0 max-w-full px-4 sm:px-6 lg:px-8">
          {params.error ? (
            <Card className="mb-6 border-red-300/20 bg-red-300/[0.04] p-4 text-sm text-red-100">
              {params.error}
            </Card>
          ) : null}
          {params.approved ? (
            <Card className="mb-6 border-emerald-300/20 bg-emerald-300/[0.04] p-4 text-sm text-emerald-100">
              Approval processed. Check the three statuses below.
            </Card>
          ) : null}
          {params.skipped ? (
            <Card className="mb-6 border-white/12 p-4 text-sm text-white/64">
              Today&apos;s Daily Boosts were skipped.
            </Card>
          ) : null}

          {!run ? (
            <Card className="p-6 sm:p-8">
              <h2 className="text-xl font-semibold text-white">No Daily Boost run yet.</h2>
              <p className="mt-2 text-sm leading-6 text-white/52">
                The morning scheduler will create today&apos;s picks and email the approval link here.
              </p>
            </Card>
          ) : (
            <div className="grid gap-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/38">
                    {run.localDate}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold text-white">
                    @{run.actorHandle} · {run.status}
                  </h2>
                </div>
                <p className="text-sm text-white/45">
                  {run.items.length} pick{run.items.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                {run.items.map((item, index) => (
                  <Card key={item.postUri} className="flex min-w-0 flex-col p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#8ce8ff]">
                        {String(index + 1).padStart(2, "0")} · {slotLabel(item.slot)}
                      </p>
                      <span className="rounded-full border border-white/10 px-2 py-1 text-[11px] text-white/45">
                        {item.status}
                      </span>
                    </div>
                    <h3 className="mt-4 break-all text-lg font-semibold text-white">
                      @{item.subjectHandle}
                    </h3>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-white/68">
                      {item.postText}
                    </p>
                    <div className="mt-4 text-xs leading-5 text-white/40">
                      <p>{item.reason}</p>
                      <p className="mt-1">
                        {item.likeCount} likes · {item.repostCount} reposts · {item.replyCount} replies · {item.quoteCount} quotes
                      </p>
                      {item.lastError ? (
                        <p className="mt-2 text-red-200/80">{item.lastError}</p>
                      ) : null}
                    </div>
                    <a
                      href={dailyBoostPostUrl(item)}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 text-sm font-semibold text-[#8ce8ff] hover:text-white"
                    >
                      Open post ↗
                    </a>
                  </Card>
                ))}
              </div>

              {run.status === "prepared" && actionToken ? (
                <Card className="p-5 sm:p-6">
                  <p className="text-sm leading-6 text-white/58">
                    Approval immediately reposts the three reviewed picks. Opening the email or this page never posts anything by itself.
                  </p>
                  <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                    <form method="post" action="/api/advanced-network/daily-boosts/approve">
                      <input type="hidden" name="token" value={actionToken} />
                      <input type="hidden" name="action" value="approve" />
                      <button
                        type="submit"
                        className={buttonStyles({ variant: "primary", size: "lg" })}
                      >
                        Approve today&apos;s 3
                      </button>
                    </form>
                    <form method="post" action="/api/advanced-network/daily-boosts/approve">
                      <input type="hidden" name="token" value={actionToken} />
                      <input type="hidden" name="action" value="skip" />
                      <button
                        type="submit"
                        className={buttonStyles({ variant: "ghost", size: "lg" })}
                      >
                        Skip today
                      </button>
                    </form>
                  </div>
                </Card>
              ) : null}
            </div>
          )}
        </Container>
      </Section>
    </>
  );
}
