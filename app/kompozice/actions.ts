"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { atLeast } from "@/lib/roles";
import * as comps from "@/lib/comps";

async function requireCaller() {
  const user = await getSessionUser();
  if (!user || !atLeast(user.webRole, "caller")) {
    throw new Error("Kompozice spravuje jen caller nebo vedení.");
  }
  return user;
}

export async function saveTemplateAction(formData: FormData) {
  const user = await requireCaller();

  const idRaw = formData.get("id");
  const id = idRaw ? Number(idRaw) : null;
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const slotsText = String(formData.get("slots") ?? "").slice(0, 30000);

  if (!name) throw new Error("Chybí název kompozice.");

  comps.saveTemplate(id, name, slotsText, user.discordId);
  revalidatePath("/kompozice");
  redirect("/kompozice");
}

export async function deleteTemplateAction(formData: FormData) {
  await requireCaller();
  comps.deleteTemplate(Number(formData.get("id")));
  revalidatePath("/kompozice");
  redirect("/kompozice");
}
