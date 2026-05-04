// lib/notifications.ts
import { db } from "@/lib/db";
import { NotificationType } from "@prisma/client";

export type NotificationRelatedEntity = {
  type: string;
  id: string;
};

/**
 * Notification i18n title/body keys per type.
 * Each value is an object with en/fr/rw strings.
 */
const notificationContent: Record<
  NotificationType,
  { title: Record<string, string>; body: Record<string, string> }
> = {
  COURSE_APPROVED: {
    title: {
      en: "Course Approved",
      fr: "Cours approuvé",
      rw: "Isomo ryemejwe",
    },
    body: {
      en: "Your course has been approved and is now published.",
      fr: "Votre cours a été approuvé et est maintenant publié.",
      rw: "Isomo ryawe ryemejwe kandi ryasohotse.",
    },
  },
  COURSE_REJECTED: {
    title: {
      en: "Course Rejected",
      fr: "Cours refusé",
      rw: "Isomo ryanze",
    },
    body: {
      en: "Your course was not approved. Please review the feedback and resubmit.",
      fr: "Votre cours n'a pas été approuvé. Veuillez consulter les commentaires et le soumettre à nouveau.",
      rw: "Isomo ryawe ntirymejwe. Reba ibitekerezo hanyuma usubmite nanone.",
    },
  },
  COURSE_ENROLLED: {
    title: {
      en: "Enrollment Confirmed",
      fr: "Inscription confirmée",
      rw: "Kwiyandikisha kwemejwe",
    },
    body: {
      en: "You have successfully enrolled in the course. Start learning today!",
      fr: "Vous êtes bien inscrit au cours. Commencez à apprendre aujourd'hui !",
      rw: "Wiyandikishije neza mu isomo. Tangira kwiga uyu munsi!",
    },
  },
  QUIZ_PASSED: {
    title: {
      en: "Quiz Passed! 🎉",
      fr: "Quiz réussi ! 🎉",
      rw: "Ikizamini wayishoboye! 🎉",
    },
    body: {
      en: "Congratulations! You passed the quiz. Your certificate is now available.",
      fr: "Félicitations ! Vous avez réussi le quiz. Votre certificat est maintenant disponible.",
      rw: "Amahoro! Wayishoboye ikizamini. Impamyabumenyi yawe iragaragara.",
    },
  },
  QUIZ_FAILED: {
    title: {
      en: "Keep Going – Try Again",
      fr: "Continuez – Réessayez",
      rw: "Komeza – Ongera ugerageze",
    },
    body: {
      en: "You didn't pass this time, but don't give up! Review the lesson and try again.",
      fr: "Vous n'avez pas réussi cette fois, mais ne vous découragez pas ! Revoyez la leçon et réessayez.",
      rw: "Ntiwashoboye uyu mwanya, ariko ntihangayike! Subiramo isomo hanyuma ongera ugerageze.",
    },
  },
  INTERVENTION_FLAG: {
    title: {
      en: "Farmer Flagged for Intervention",
      fr: "Agriculteur signalé pour intervention",
      rw: "Umuhinzi araflagwe kugira ubufasha",
    },
    body: {
      en: "A farmer has been automatically flagged and may require your attention.",
      fr: "Un agriculteur a été automatiquement signalé et peut nécessiter votre attention.",
      rw: "Umuhinzi aflagiwe bwa kigenomukore kandi ashobora gusaba ubutabazi bwawe.",
    },
  },
  MESSAGE_RECEIVED: {
    title: {
      en: "New Message",
      fr: "Nouveau message",
      rw: "Ubutumwa bushya",
    },
    body: {
      en: "You have received a new message from Mbaza staff.",
      fr: "Vous avez reçu un nouveau message du personnel Mbaza.",
      rw: "Wakiriye ubutumwa bushya buvuye ku bakozi ba Mbaza.",
    },
  },
  TRANSLATION_READY: {
    title: {
      en: "AI Translation Ready for Review",
      fr: "Traduction IA prête pour révision",
      rw: "Ubuhinduzi bwa AI burategurwa isuzumwa",
    },
    body: {
      en: "The AI translation of your quiz is ready. Please review and approve the translations.",
      fr: "La traduction IA de votre quiz est prête. Veuillez revoir et approuver les traductions.",
      rw: "Ubuhinduzi bwa AI bw'ikizamini cyawe burategurwa. Subiramo hanyuma wemeze ubuhinduzi.",
    },
  },
  SYSTEM_ANNOUNCEMENT: {
    title: {
      en: "System Announcement",
      fr: "Annonce du système",
      rw: "Itangazo rya sisiteme",
    },
    body: {
      en: "There is a new system announcement for all users.",
      fr: "Il y a une nouvelle annonce du système pour tous les utilisateurs.",
      rw: "Hari itangazo rishya rya sisiteme ku bakoresha bose.",
    },
  },
  SHORT_ANSWER_GRADED: {
    title: {
      en: "Short Answer Graded",
      fr: "Réponse courte notée",
      rw: "Igisubizo gito girangiwe",
    },
    body: {
      en: "Your short answer response has been graded. Check your quiz results for details.",
      fr: "Votre réponse courte a été notée. Vérifiez vos résultats de quiz pour les détails.",
      rw: "Igisubizo cyawe gito cyarangiwe. Reba ibisubizo by'ikizamini cyawe.",
    },
  },
  SHORT_ANSWER_FLAGGED: {
    title: {
      en: "Short Answer Result Disputed",
      fr: "Résultat de réponse courte contesté",
      rw: "Igisubizo gito cyaburiwe",
    },
    body: {
      en: "A farmer has disputed a short answer grade. Please review and address their concern.",
      fr: "Un agriculteur a contesté une note de réponse courte. Veuillez examiner et traiter leur préoccupation.",
      rw: "Umuhinzi yaburanye amanota y'igisubizo gito. Reba hanyuma ugire igisubizo.",
    },
  },
};

export async function createNotification(
  userId: string,
  type: NotificationType,
  customTitle?: Record<string, string>,
  customBody?: Record<string, string>,
  relatedEntity?: NotificationRelatedEntity
) {
  const defaults = notificationContent[type];
  return db.notification.create({
    data: {
      userId,
      type,
      title: customTitle ?? defaults.title,
      body: customBody ?? defaults.body,
      relatedEntityType: relatedEntity?.type ?? null,
      relatedEntityId: relatedEntity?.id ?? null,
    },
  });
}

export async function createNotificationForAllUsers(
  type: NotificationType,
  customTitle?: Record<string, string>,
  customBody?: Record<string, string>
) {
  const users = await db.user.findMany({ where: { isActive: true }, select: { id: true } });
  const defaults = notificationContent[type];
  await db.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type,
      title: customTitle ?? defaults.title,
      body: customBody ?? defaults.body,
    })),
  });
}
