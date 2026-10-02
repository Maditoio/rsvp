"use client";

import { Drawer } from "@/components/ui/drawer";

export type RegistrationAnswerRow = {
  key: string;
  label: string;
  value: string;
};

export function RegistrationAnswersDrawer({
  open,
  onClose,
  name,
  email,
  status,
  submittedAt,
  answers,
}: {
  open: boolean;
  onClose: () => void;
  name: string;
  email: string;
  status: string;
  submittedAt: string;
  answers: RegistrationAnswerRow[];
}) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={name}
      description={`${email} · ${status} · ${submittedAt}`}
      size="lg"
    >
      {answers.length === 0 ? (
        <p className="text-sm text-slate-600">No answers recorded.</p>
      ) : (
        <dl className="space-y-4">
          {answers.map((answer) => (
            <div key={answer.key}>
              <dt className="text-[0.71875rem] font-semibold uppercase tracking-[0.04em] text-slate-400">
                {answer.label}
              </dt>
              <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-900">
                {answer.value}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Drawer>
  );
}
