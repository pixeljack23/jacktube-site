import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });

process.on("unhandledRejection", (reason) => {
  console.error("[admin] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("[admin] Uncaught Exception:", err);
});

const app = express();
const port = Number(process.env.ADMIN_PORT || 3002);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function isAllowedVideoUrl(videoUrl) {
  if (!videoUrl || typeof videoUrl !== "string") return false;

  const trimmed = videoUrl.trim();
  const allowedPrefixes = [
    "https://www.youtube.com/embed/",
    "https://youtube.com/embed/",
    "https://www.youtube-nocookie.com/embed/",
  ];

  return allowedPrefixes.some((p) => trimmed.startsWith(p));
}

function isValidAdminPin(pin) {
  return Boolean(process.env.ADMIN_PIN) && pin === process.env.ADMIN_PIN;
}

function createSupabaseAdminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return { client: null, error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env" };
  }

  return { client: createClient(url, key), error: "" };
}

async function fetchCurrentVideoUrl(supabaseAdmin) {
  const fallback = "https://www.youtube.com/embed/dQw4w9WgXcQ";

  if (!supabaseAdmin) return fallback;

  const { data, error } = await supabaseAdmin
    .from("sitecontent")
    .select("video_url")
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[admin] fetch video error:", error.message);
    return fallback;
  }

  if (data && data.length > 0 && typeof data[0].video_url === "string") {
    return data[0].video_url.trim() || fallback;
  }

  return fallback;
}

app.get("/", async (req, res) => {
  const { client: supabaseAdmin, error: supabaseError } = createSupabaseAdminClient();
  const currentVideoUrl = await fetchCurrentVideoUrl(supabaseAdmin);

  res.render("admin", {
    title: "Admin | PixelJack23 🎮",
    activeTab: "video",
    success: "",
    error: supabaseError,
    currentVideoUrl,
    values: { videoUrl: currentVideoUrl },
    messages: []
  });
});

app.get("/messages", async (req, res) => {
  const { client: supabaseAdmin, error: supabaseError } = createSupabaseAdminClient();

  if (supabaseError) {
    return res.status(500).render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "messages",
      success: "",
      error: supabaseError,
      currentVideoUrl: await fetchCurrentVideoUrl(null),
      values: { videoUrl: "" },
      messages: []
    });
  }

  const currentVideoUrl = await fetchCurrentVideoUrl(supabaseAdmin);

  try {
    const { data, error } = await supabaseAdmin
      .from("messages")
      .select("id, name, email, message, created_at")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      console.error("[admin] fetch messages error:", error.message);
      return res.status(500).render("admin", {
        title: "Admin | PixelJack23 🎮",
        activeTab: "messages",
        success: "",
        error: "Failed to fetch messages.",
        currentVideoUrl,
        values: { videoUrl: currentVideoUrl },
        messages: []
      });
    }

    return res.render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "messages",
      success: "",
      error: "",
      currentVideoUrl,
      values: { videoUrl: currentVideoUrl },
      messages: data || []
    });
  } catch (err) {
    console.error("[admin] unexpected fetch messages error:", err.message);
    return res.status(500).render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "messages",
      success: "",
      error: "Something went wrong while fetching messages.",
      currentVideoUrl,
      values: { videoUrl: currentVideoUrl },
      messages: []
    });
  }
});

app.post("/video", async (req, res) => {
  const pin = (req.body.pin || "").trim();
  const videoUrl = (req.body.videoUrl || "").trim();

  const { client: supabaseAdmin, error: supabaseError } = createSupabaseAdminClient();
  const currentVideoUrl = await fetchCurrentVideoUrl(supabaseAdmin);

  if (supabaseError) {
    return res.status(500).render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "video",
      success: "",
      error: supabaseError,
      currentVideoUrl,
      values: { videoUrl },
      messages: []
    });
  }

  if (!isValidAdminPin(pin)) {
    return res.status(401).render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "video",
      success: "",
      error: "Invalid admin PIN.",
      currentVideoUrl,
      values: { videoUrl },
      messages: []
    });
  }

  if (!isAllowedVideoUrl(videoUrl)) {
    return res.status(400).render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "video",
      success: "",
      error: "Please enter a valid YouTube embed URL.",
      currentVideoUrl,
      values: { videoUrl },
      messages: []
    });
  }

  const { error } = await supabaseAdmin.from("sitecontent").insert([{ video_url: videoUrl }]);

  if (error) {
    console.error("[admin] insert error:", error.message);
    return res.status(500).render("admin", {
      title: "Admin | PixelJack23 🎮",
      activeTab: "video",
      success: "",
      error: "Failed to update the featured video.",
      currentVideoUrl,
      values: { videoUrl },
      messages: []
    });
  }

  return res.render("admin", {
    title: "Admin | PixelJack23 🎮",
    activeTab: "video",
    success: "Featured video updated successfully!",
    error: "",
    currentVideoUrl: videoUrl,
    values: { videoUrl },
    messages: []
  });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`[admin] Listening on http://127.0.0.1:${port}`);
  console.log(`[admin] ADMIN_PIN set: ${Boolean(process.env.ADMIN_PIN)}`);
});