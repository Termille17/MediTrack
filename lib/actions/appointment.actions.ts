"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";

import { Appointment } from "@/types/appwrite.types";

import {
  APPOINTMENT_COLLECTION_ID,
  DATABASE_ID,
  databases,
  messaging,
} from "../appwrite.config";
import { formatDateTime, parseStringify } from "../utils";

//  CREATE APPOINTMENT
export const createAppointment = async (
  appointment: CreateAppointmentParams
) => {
  try {
    const newAppointment = await databases.createDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      ID.unique(),
      appointment
    );

    revalidatePath("/admin");
    return parseStringify(newAppointment);
  } catch (error) {
    console.error("An error occurred while creating a new appointment:", error);
  }
};

//  GET RECENT APPOINTMENTS
export const getRecentAppointmentList = async () => {
  try {
    const appointments = await databases.listDocuments(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      [Query.orderDesc("$createdAt")]
    );

    // const scheduledAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "scheduled");

    // const pendingAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "pending");

    // const cancelledAppointments = (
    //   appointments.documents as Appointment[]
    // ).filter((appointment) => appointment.status === "cancelled");

    // const data = {
    //   totalCount: appointments.total,
    //   scheduledCount: scheduledAppointments.length,
    //   pendingCount: pendingAppointments.length,
    //   cancelledCount: cancelledAppointments.length,
    //   documents: appointments.documents,
    // };

    const initialCounts = {
      scheduledCount: 0,
      pendingCount: 0,
      cancelledCount: 0,
    };

    const counts = (appointments.documents as Appointment[]).reduce(
      (acc, appointment) => {
        switch (appointment.status) {
          case "scheduled":
            acc.scheduledCount++;
            break;
          case "pending":
            acc.pendingCount++;
            break;
          case "cancelled":
            acc.cancelledCount++;
            break;
        }
        return acc;
      },
      initialCounts
    );

    const data = {
      totalCount: appointments.total,
      ...counts,
      documents: appointments.documents,
    };

    return parseStringify(data);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the recent appointments:",
      error
    );
  }
};

//  SEND SMS NOTIFICATION
export const sendSMSNotification = async (userId: string, content: string) => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createSms
    const message = await messaging.createSms(
      ID.unique(),
      content,
      [],
      [userId]
    );
    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending sms:", error);
  }
};

// SEND EMAIL NOTIFICATION
export const sendEmailNotification = async (
  userId: string,
  subject: string,
  content: string
) => {
  try {
    // https://appwrite.io/docs/references/1.5.x/server-nodejs/messaging#createEmail
    const message = await messaging.createEmail(
      ID.unique(),
      subject,
      content,
      [],
      [userId]
    );

    return parseStringify(message);
  } catch (error) {
    console.error("An error occurred while sending email:", error);
  }
};


//  UPDATE APPOINTMENT
export const updateAppointment = async ({
  appointmentId,
  userId,
  timeZone,
  appointment,
  type,
}: UpdateAppointmentParams) => {
  try {
    const updatedAppointment = await databases.updateDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId,
      appointment
    );

    if (!updatedAppointment) throw Error;

    const dateTime = formatDateTime(appointment.schedule!, timeZone).dateTime;

    const smsMessage =
      type === "schedule"
        ? `Greetings from MediTrack. Your appointment is confirmed for ${dateTime} with Dr. ${appointment.primaryPhysician}.`
        : `Greetings from MediTrack. Your appointment for ${dateTime} is cancelled. Reason: ${appointment.cancellationReason}`;

    const emailSubject =
      type === "schedule"
        ? "Appointment Confirmation"
        : "Appointment Cancellation";

    const emailMessage =type === "schedule"
    ? `
      <p>Dear Patient,</p>
      <p>This is a confirmation of your upcoming appointment scheduled for:</p>
      <p>📅 <strong>Date & Time:</strong> ${dateTime}<br/>
      👨‍⚕️ <strong>Physician:</strong> Dr. ${appointment.primaryPhysician}</p>
      <p>Please arrive at least 10 minutes early and bring any relevant medical documents.</p>
      <p>If you have any questions, feel free to contact us.</p>
      <p>Kind regards,<br/>MediTrack Support Team</p>
    `
    : `
      <p>Dear Patient,</p>
      <p>We regret to inform you that your appointment originally scheduled for:</p>
      <p>📅 <strong>Date & Time:</strong> ${dateTime}</p>
      <p>📝 <strong>Reason:</strong> ${appointment.cancellationReason}</p>
      <p>If you'd like to reschedule or need further assistance, please don't hesitate to reach out.</p>
      <p>Kind regards,<br/>MediTrack Support Team</p>
    `;

    await Promise.all([
      sendSMSNotification(userId, smsMessage),
      sendEmailNotification(userId, emailSubject, emailMessage),
    ]);

    revalidatePath("/admin");
    return parseStringify(updatedAppointment);
  } catch (error) {
    console.error("An error occurred while scheduling an appointment:", error);
  }
};


// GET APPOINTMENT
export const getAppointment = async (appointmentId: string) => {
  try {
    const appointment = await databases.getDocument(
      DATABASE_ID!,
      APPOINTMENT_COLLECTION_ID!,
      appointmentId
    );

    return parseStringify(appointment);
  } catch (error) {
    console.error(
      "An error occurred while retrieving the existing patient:",
      error
    );
  }
};
