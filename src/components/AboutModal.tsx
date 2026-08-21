"use client";

import { useState } from "react";

export default function AboutModal() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg border border-[var(--border)] px-2.5 py-1 text-[12px] text-[var(--text-dim)] hover:text-[var(--text)]"
      >
        درباره
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div
            className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[var(--border)] bg-[var(--bg-raised)] p-5 text-[13px] leading-7"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="mb-2 text-base font-bold">✦ ایجنت لیارا چطور کار می‌کند؟</h3>
            <ul className="mb-3 list-disc space-y-1.5 pr-4">
              <li>
                <b>دانش:</b> جستجوی هیبریدی (کلیدواژه + معنایی) روی کل مستندات لیارا — راهنماهای
                فارسی docs.liara.ir و مرجع انگلیسی API. هر پاسخ، منبع دارد.
              </li>
              <li>
                <b>اقدام:</b> با اتصال حساب، ایجنت از طریق API رسمی لیارا اپ‌ها، لاگ‌ها، دیپلوی‌ها و
                دیتابیس‌های شما را بررسی می‌کند.
              </li>
              <li>
                <b>امنیت:</b> تغییرات مخرب‌گونه فقط با تأیید صریح شما انجام می‌شود (ری‌استارت، تغییر
                متغیرها، دیپلوی مجدد). حذف منابع اصلاً در دسترس ایجنت نیست. توکن شما فقط در حافظه‌ی
                سرور می‌ماند و لاگ نمی‌شود.
              </li>
              <li>
                <b>کنترل هزینه:</b> سقف توکن برای هر نشست، برش خروجی ابزارها، و کش جستجو — مصرف
                زنده را در پایین صفحه ببینید.
              </li>
            </ul>
            <p className="text-[12px] text-[var(--text-dim)]">
              ساخته‌شده با Eve (عامل پایدار) روی Next.js — کد کامل و معماری در مخزن گیت‌هاب پروژه.
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-4 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[13px]"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </>
  );
}
