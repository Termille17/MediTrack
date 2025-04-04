"use client";

import {
  getPaginationRowModel,
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Image from "next/image";
import { redirect } from "next/navigation";
import { useEffect } from "react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { decryptKey } from "@/lib/utils";
import { Appointment } from "@/types/appwrite.types";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export const generatePatientPDF = (appointment: Appointment) => {
  const { patient } = appointment;
  const doc = new jsPDF();
  let currentY = 20;

  // Title
  doc.setFontSize(20);
  doc.text("Patient Medical Summary", 14, currentY);
  currentY += 8;
  doc.setFontSize(12);
  doc.setTextColor(100);

  // Helper function to render each section
  const renderTable = (headTitle: string, bodyData: string[][], fillColor: number[]) => {
    autoTable(doc, {
      startY: currentY,
      head: [[headTitle]],
      body: bodyData,
      theme: "grid",
      styles: { fontStyle: "normal" },
      headStyles: { fillColor: [fillColor[0] || 0, fillColor[1] || 0, fillColor[2] || 0] },
      margin: { left: 14, right: 14 },
    });

    const rowHeight = 10; // estimate row height for spacing
    currentY += bodyData.length * rowHeight + 12;
  };

  // Section: Personal Information
  renderTable("Personal Information", [
    [`Full Name: ${patient?.name || "N/A"}`],
    [`Phone: ${patient?.phone || "N/A"}`],
    [`Email: ${patient?.email || "N/A"}`],
    [`Gender: ${patient?.gender || "N/A"}`],
    [`Date of Birth: ${patient?.birthDate ? new Date(patient.birthDate).toLocaleDateString() : "N/A"}`],
    [`Address: ${patient?.address || "N/A"}`],
    [`Occupation: ${patient?.occupation || "N/A"}`],
  ], [41, 128, 185]);

  // Section: Emergency & Insurance
  renderTable("Emergency & Insurance", [
    [`Emergency Contact: ${patient?.emergencyContactName || "N/A"}`],
    [`Emergency Number: ${patient?.emergencyContactNumber || "N/A"}`],
    [`Primary Physician: ${patient?.primaryPhysician || "N/A"}`],
    [`Insurance Provider: ${patient?.insuranceProvider || "N/A"}`],
    [`Policy Number: ${patient?.insurancePolicyNumber || "N/A"}`],
  ], [241, 196, 15]);

  // Section: Medical History
  renderTable("Medical History", [
    [`Allergies: ${patient?.allergies || "None"}`],
    [`Current Medication: ${patient?.currentMedication || "None"}`],
    [`Family History: ${patient?.familyMedicalHistory || "None"}`],
    [`Past Medical History: ${patient?.pastMedicalHistory || "None"}`],
  ], [39, 174, 96]);

  // Section: Identification
  renderTable("Identification", [
    [`ID Type: ${patient?.identificationType || "N/A"}`],
    [`ID Number: ${patient?.identificationNumber || "N/A"}`],
  ], [142, 68, 173]);

  // Section: Appointment Info
  renderTable("Appointment Details", [
    [`Doctor: ${appointment.primaryPhysician || "N/A"}`],
    [`Date: ${new Date(appointment.schedule).toLocaleString()}`],
    [`Status: ${appointment.status}`],
    [`Reason: ${appointment.reason}`],
    [`Note: ${appointment.note || "N/A"}`],
  ], [231, 76, 60]);

  // Save PDF
  const safeName = patient?.name?.replace(/\s+/g, "_").toLowerCase() || "patient";
  doc.save(`${safeName}_summary.pdf`);
};

export function DataTable<TData extends Appointment, TValue>({
  columns,
  data,
}: DataTableProps<TData, TValue>) {
  const encryptedKey =
    typeof window !== "undefined"
      ? window.localStorage.getItem("accessKey")
      : null;

  useEffect(() => {
    const accessKey = encryptedKey && decryptKey(encryptedKey);
    if (accessKey !== process.env.NEXT_PUBLIC_ADMIN_PASSKEY!.toString()) {
      redirect("/");
    }
  }, [encryptedKey]);

  // Add download column dynamically
  const extendedColumns: ColumnDef<TData, TValue>[] = [
    ...columns,
    {
      id: "actions",
      header: () => "Actions",
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => generatePatientPDF(row.original)}
        >
          Download PDF
        </Button>
      ),
    },
  ];

  const table = useReactTable({
    data,
    columns: extendedColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <div className="data-table">
      <Table className="shad-table">
        <TableHeader className=" bg-dark-200">
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="shad-table-row-header">
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows?.length ? (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                data-state={row.getIsSelected() && "selected"}
                className="shad-table-row"
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={columns.length + 1} className="h-24 text-center">
                No results.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      <div className="table-actions">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="shad-gray-btn"
        >
          <Image
            src="/assets/icons/arrow.svg"
            width={24}
            height={24}
            alt="arrow"
          />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="shad-gray-btn"
        >
          <Image
            src="/assets/icons/arrow.svg"
            width={24}
            height={24}
            alt="arrow"
            className="rotate-180"
          />
        </Button>
      </div>
    </div>
  );
}
