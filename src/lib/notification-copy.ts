import type { CareNotification, NotificationType } from "@/lib/notifications";

type Locale = "en" | "ar";

const COPY: Record<Locale, Partial<Record<NotificationType, { title: string; body: string }>>> = {
  en: {
    ASSESSMENT_RELEASED: { title: "ReproAI · Care update", body: "Your clinician shared an assessment. Open it to review the details." },
    FOLLOW_UP_OPENED: { title: "ReproAI · Care follow-up", body: "Your care team recommends a follow-up. Open your portal to review it." },
    INSIGHT_UPDATE: { title: "ReproAI · Care update", body: "Your care team shared a new update. Open it to review the details." },
    LAB_VERIFIED: { title: "ReproAI · Lab update", body: "A lab result was verified. Open your portal to review the update." },
    APPOINTMENT_REQUESTED: { title: "ReproAI · Consultation request", body: "A patient requested a follow-up consultation. Open the case to review it." },
    APPOINTMENT_ACCEPTED: { title: "ReproAI · Suggestion accepted", body: "A patient accepted the suggested follow-up. Open the case to confirm the appointment." },
    APPOINTMENT_DECLINED: { title: "ReproAI · New suggestion needed", body: "A patient declined the suggested time. Open the case to review next steps." },
    APPOINTMENT_SUGGESTED: { title: "ReproAI · Consultation suggestion", body: "Your care team suggested a follow-up time. Open your portal to review it." },
    APPOINTMENT_CONFIRMED: { title: "ReproAI · Appointment confirmed", body: "Your consultation has been confirmed. Open your portal to review the details." },
    APPOINTMENT_CANCELLED: { title: "ReproAI · Appointment update", body: "An appointment was cancelled. Open your portal to review the update." },
    WEARABLE_ALERT: { title: "ReproAI · Wearable signal to review", body: "A patient's home readings meet a follow-up rule. Open the follow-up board to review." },
    CYCLE_ALERT: { title: "ReproAI · Cycle pattern to review", body: "A patient's cycle log meets a follow-up rule. Open the follow-up board to review." },
    CYCLE_REMINDER: { title: "ReproAI · Still tracking this cycle?", body: "A quick log keeps your cycle picture accurate. You can also pause tracking at any time." },
    LAB_REVIEW_DUE: { title: "ReproAI · Results may be due for review", body: "A patient trying to conceive has no recent reserve or semen result. Open the case to review." },
    WEEKLY_SUMMARY: { title: "ReproAI · Your week in health", body: "Your weekly pattern summary is ready. Open your portal to see it." }
  },
  ar: {
    ASSESSMENT_RELEASED: { title: "ReproAI · تحديث الرعاية", body: "شارك طبيبك تقييماً جديداً. يمكنك فتحه للاطلاع على التفاصيل." },
    FOLLOW_UP_OPENED: { title: "ReproAI · متابعة الرعاية", body: "يوصي فريق الرعاية بالمتابعة. يمكنك فتح البوابة للاطلاع على التفاصيل." },
    INSIGHT_UPDATE: { title: "ReproAI · تحديث الرعاية", body: "شارك فريق الرعاية تحديثاً جديداً. يمكنك فتحه للاطلاع على التفاصيل." },
    LAB_VERIFIED: { title: "ReproAI · تحديث المختبر", body: "تم التحقق من نتيجة مختبرية. يمكنك فتح البوابة للاطلاع على التحديث." },
    APPOINTMENT_REQUESTED: { title: "ReproAI · طلب استشارة", body: "تم تقديم طلب استشارة متابعة. يرجى فتح الحالة لمراجعته." },
    APPOINTMENT_ACCEPTED: { title: "ReproAI · قبول الموعد المقترح", body: "تم قبول موعد المتابعة المقترح. يرجى فتح الحالة لتأكيد الموعد." },
    APPOINTMENT_DECLINED: { title: "ReproAI · يلزم اقتراح موعد جديد", body: "تم رفض الموعد المقترح. يرجى فتح الحالة لمراجعة الخطوات التالية." },
    APPOINTMENT_SUGGESTED: { title: "ReproAI · اقتراح استشارة", body: "اقترح فريق الرعاية موعداً للمتابعة. يمكنك فتح البوابة للاطلاع عليه." },
    APPOINTMENT_CONFIRMED: { title: "ReproAI · تم تأكيد الموعد", body: "تم تأكيد الاستشارة. يمكنك فتح البوابة للاطلاع على التفاصيل." },
    APPOINTMENT_CANCELLED: { title: "ReproAI · تحديث الموعد", body: "تم إلغاء موعد. يمكنك فتح البوابة للاطلاع على التحديث." },
    WEARABLE_ALERT: { title: "ReproAI · إشارة من القراءات المنزلية للمراجعة", body: "تستوفي قراءات أحد المرضى المنزلية إحدى قواعد المتابعة. يرجى فتح لوحة المتابعة للمراجعة." },
    CYCLE_ALERT: { title: "ReproAI · نمط دورة للمراجعة", body: "يستوفي سجل دورة إحدى المريضات قاعدة متابعة. يرجى فتح لوحة المتابعة للمراجعة." },
    CYCLE_REMINDER: { title: "ReproAI · هل ما زلتِ تتابعين هذه الدورة؟", body: "تسجيل سريع يُبقي صورة دورتك دقيقة. يمكنك أيضًا إيقاف المتابعة مؤقتًا في أي وقت." },
    LAB_REVIEW_DUE: { title: "ReproAI · قد تحتاج النتائج إلى مراجعة", body: "لا توجد نتيجة حديثة للمخزون المبيضي أو للسائل المنوي لدى مريض يحاول الإنجاب. يرجى فتح الحالة للمراجعة." },
    WEEKLY_SUMMARY: { title: "ReproAI · أسبوعك الصحي", body: "ملخص نمطك الأسبوعي جاهز. افتح البوابة للاطلاع عليه." }
  }
};

export function notificationCopy(notification: CareNotification, locale: Locale) {
  return COPY[locale][notification.type] ?? { title: notification.title, body: notification.body };
}

