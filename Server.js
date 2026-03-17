import express from "express";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

function getSafeVideoUrl(videoUrl) {
  const fallback = "https://www.youtube.com/embed/dQw4w9WgXcQ";

  if (!videoUrl || typeof videoUrl !== "string") {
    return fallback;
  }

  const trimmed = videoUrl.trim();
  const allowedPrefixes = [
    "https://www.youtube.com/embed/",
    "https://youtube.com/embed/",
    "https://www.youtube-nocookie.com/embed/"
  ];

  if (allowedPrefixes.some((prefix) => trimmed.startsWith(prefix))) {
    return trimmed;
  }

  return fallback;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

app.get("/", async (req, res) => {
  let videoUrl = "https://www.youtube.com/embed/dQw4w9WgXcQ";

  try {
    const { data, error } = await supabase
      .from("sitecontent")
      .select("video_url")
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching video:", error.message);
    } else if (data && data.length > 0) {
      videoUrl = getSafeVideoUrl(data[0].video_url);
    }
  } catch (err) {
    console.error("Unexpected error fetching video:", err.message);
  }

  res.render("index", {
    title: "PixelJack23 🎮",
    videoUrl,
    discordUrl: process.env.DISCORD_URL || "#",
    patreonUrl: process.env.PATREON_URL || "#",
    coffeeUrl: process.env.COFFEE_URL || "#"
  });
});

// ... existing code ...

app.get("/contact", (req, res) => {
  res.render("contact", {
    title: "Contact | PixelJack23 🎮",
    success: "",
    error: "",
    values: {
      name: "",
      email: "",
      message: ""
    },
    discordUrl: process.env.DISCORD_URL || "#",
    patreonUrl: process.env.PATREON_URL || "#",
    coffeeUrl: process.env.COFFEE_URL || "#"
  });
});

// ... existing code ...

app.post("/contact", async (req, res) => {
  const name = (req.body.name || "").trim();
  const email = (req.body.email || "").trim();
  const message = (req.body.message || "").trim();
  const website = (req.body.website || "").trim();

  const values = { name, email, message };

  if (website) {
    return res.status(400).render("contact", {
      title: "Contact | PixelJack23 🎮",
      success: "",
      error: "Submission rejected.",
      values,
      discordUrl: process.env.DISCORD_URL || "#",
      patreonUrl: process.env.PATREON_URL || "#",
      coffeeUrl: process.env.COFFEE_URL || "#"
    });
  }

  if (!name || !email || !message) {
    return res.status(400).render("contact", {
      title: "Contact | PixelJack23 🎮",
      success: "",
      error: "Please fill in all fields.",
      values,
      discordUrl: process.env.DISCORD_URL || "#",
      patreonUrl: process.env.PATREON_URL || "#",
      coffeeUrl: process.env.COFFEE_URL || "#"
    });
  }

  if (!isValidEmail(email)) {
    return res.status(400).render("contact", {
      title: "Contact | PixelJack23 🎮",
      success: "",
      error: "Please enter a valid email address.",
      values,
      discordUrl: process.env.DISCORD_URL || "#",
      patreonUrl: process.env.PATREON_URL || "#",
      coffeeUrl: process.env.COFFEE_URL || "#"
    });
  }

  if (name.length > 100 || email.length > 150 || message.length > 2000) {
    return res.status(400).render("contact", {
      title: "Contact | PixelJack23 🎮",
      success: "",
      error: "One or more fields are too long.",
      values,
      discordUrl: process.env.DISCORD_URL || "#",
      patreonUrl: process.env.PATREON_URL || "#",
      coffeeUrl: process.env.COFFEE_URL || "#"
    });
  }

  try {
    const { error } = await supabase
      .from("messages")
      .insert([{ name, email, message }]);

    if (error) {
      console.error("Supabase insert error:", error.message);
      return res.status(500).render("contact", {
        title: "Contact | PixelJack23 🎮",
        success: "",
        error: "Failed to send message. Try again later.",
        values,
        discordUrl: process.env.DISCORD_URL || "#",
        patreonUrl: process.env.PATREON_URL || "#",
        coffeeUrl: process.env.COFFEE_URL || "#"
      });
    }

    return res.render("contact", {
      title: "Contact | PixelJack23 🎮",
      success: "Message sent successfully!",
      error: "",
      values: {
        name: "",
        email: "",
        message: ""
      },
      discordUrl: process.env.DISCORD_URL || "#",
      patreonUrl: process.env.PATREON_URL || "#",
      coffeeUrl: process.env.COFFEE_URL || "#"
    });
  } catch (err) {
    console.error("Unexpected submit error:", err.message);
    return res.status(500).render("contact", {
      title: "Contact | PixelJack23 🎮",
      success: "",
      error: "Something went wrong. Please try again later.",
      values,
      discordUrl: process.env.DISCORD_URL || "#",
      patreonUrl: process.env.PATREON_URL || "#",
      coffeeUrl: process.env.COFFEE_URL || "#"
    });
  }
});

app.listen(port, "127.0.0.1", () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});