import { Router } from "express";
import { db, pxpConfigTable } from "@workspace/db";
import { desc } from "drizzle-orm";

const router = Router();

const DEFAULT_SCRIPT = {
  id: "root",
  text: "Hi, {contact_name}! This is {caller_name} from The Way World Outreach, {campus}. I'm on our call team and I saw you recently came forward for prayer. I just wanted to reach out. Do you have a few minutes to talk?",
  responses: [
    {
      id: "yes",
      label: "Yes / Sure",
      text: "Wonderful! We're so glad you came forward. Our pastor and team have been praying for you. Can I ask — how have you been feeling since you came forward?",
      responses: [
        {
          id: "yes-good",
          label: "Good / Better",
          text: "Praise God! That's so encouraging to hear. We'd love to continue walking alongside you. Would you be open to getting more connected with our church family at {campus}?",
          responses: [
            {
              id: "yes-good-yes",
              label: "Yes, I'd like that",
              text: "Excellent! We'd love that. Just know that we're here for you. Would it be okay if someone from our team reached out again this week, {contact_name}?",
              responses: [
                {
                  id: "close-positive",
                  label: "Yes",
                  text: "Perfect! We'll be in touch. God bless you, {contact_name}. We're believing great things for your life. Have a wonderful day!",
                  responses: [],
                  isTerminal: true,
                },
              ],
            },
            {
              id: "yes-good-no",
              label: "Not right now",
              text: "Completely understand! No pressure at all. Just know that we're here and we care. We'll keep you in our prayers. God bless you, {contact_name}!",
              responses: [],
              isTerminal: true,
            },
          ],
        },
        {
          id: "yes-struggling",
          label: "Still struggling",
          text: "I'm sorry to hear that. I want you to know that you're not alone — we're standing with you in prayer. Our pastor is available if you'd ever like to speak with someone. Would that be helpful?",
          responses: [
            {
              id: "yes-struggling-yes",
              label: "Yes",
              text: "Wonderful. I'll make sure that gets set up. In the meantime, would it be okay if we kept you in our prayer list and followed up again soon?",
              responses: [],
              isTerminal: true,
            },
            {
              id: "yes-struggling-no",
              label: "No thanks",
              text: "Absolutely no pressure. We just want you to know we care and we're praying. God bless you, {contact_name}. Please don't hesitate to reach out anytime.",
              responses: [],
              isTerminal: true,
            },
          ],
        },
      ],
    },
    {
      id: "no",
      label: "No / Bad time",
      text: "No problem at all! I completely understand. I just wanted to say that we've been praying for you and we're glad you came forward. Is there a better time I could call back?",
      responses: [
        {
          id: "no-callback",
          label: "Suggest a time",
          text: "Great! I'll make a note and we'll reach out then. God bless you, {contact_name}. Take care!",
          responses: [],
          isTerminal: true,
        },
        {
          id: "no-no-callback",
          label: "No / Please don't",
          text: "Of course, I completely respect that. Just know that we care and we'll keep you in prayer. God bless you, {contact_name}. Have a wonderful day!",
          responses: [],
          isTerminal: true,
        },
      ],
    },
    {
      id: "voicemail",
      label: "Voicemail",
      text: "Hi {contact_name}, this is {caller_name} from The Way World Outreach, {campus}. I'm on our call team and just wanted to reach out and let you know we've been praying for you since you came forward. Please feel free to call us back at your convenience. God bless you — have a wonderful day!",
      responses: [],
      isTerminal: true,
    },
  ],
};

async function getOrCreate() {
  const [existing] = await db
    .select()
    .from(pxpConfigTable)
    .orderBy(desc(pxpConfigTable.id))
    .limit(1);
  if (existing) {
    const tree = existing.scriptTree as Record<string, unknown>;
    if (!tree || Object.keys(tree).length === 0) {
      const [updated] = await db
        .update(pxpConfigTable)
        .set({ scriptTree: DEFAULT_SCRIPT })
        .returning();
      return updated;
    }
    return existing;
  }
  const [created] = await db
    .insert(pxpConfigTable)
    .values({ churchName: "The Way World Outreach", scriptTree: DEFAULT_SCRIPT })
    .returning();
  return created;
}

router.get("/", async (_req, res) => {
  try {
    const config = await getOrCreate();
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/", async (req, res) => {
  try {
    const { churchName, scriptTree } = req.body as Record<string, unknown>;
    await getOrCreate();
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (churchName !== undefined) updates.churchName = String(churchName);
    if (scriptTree !== undefined) updates.scriptTree = scriptTree;
    const [updated] = await db
      .update(pxpConfigTable)
      .set(updates)
      .returning();
    res.json(updated);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export { router as pxpConfigRouter };
