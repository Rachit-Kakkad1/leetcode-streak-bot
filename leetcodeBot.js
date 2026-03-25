const axios = require("axios");
const puppeteer = require("puppeteer");

// -----------------------------
// ✅ SAFE CHECK FUNCTION
// -----------------------------
async function checkSubmittedToday() {
  try {
    console.log("Checking submission...");

    const res = await axios.post(
      "https://leetcode.com/graphql",
      {
        query: `query { recentSubmissionList(limit: 1) { timestamp } }`
      },
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0",
          Cookie: `LEETCODE_SESSION=${process.env.LEETCODE_SESSION}; csrftoken=${process.env.CSRF_TOKEN}`
        }
      }
    );

    const list = res?.data?.data?.recentSubmissionList;

    if (!list || list.length === 0) {
      console.log("⚠️ Not logged in or no submissions");
      return false;
    }

    const last = list[0].timestamp;
    const now = Math.floor(Date.now() / 1000);

    return (now - last) < 86400;

  } catch (err) {
    console.log("⚠️ API error:", err.message);
    return false;
  }
}

// -----------------------------
// ✅ SUBMIT FUNCTION (SAFE)
// -----------------------------
async function submitSolution() {
  let browser;

  try {
    console.log("Launching browser...");

    browser = await puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });

    const page = await browser.newPage();

    // 🧠 Step 1: Open domain FIRST
    await page.goto("https://leetcode.com", {
      waitUntil: "networkidle2"
    });

    // 🧠 Step 2: Apply cookies
    console.log("Setting cookies...");

    await page.setCookie(
      {
        name: "LEETCODE_SESSION",
        value: process.env.LEETCODE_SESSION,
        domain: ".leetcode.com",
        path: "/",
        httpOnly: true,
        secure: true
      },
      {
        name: "csrftoken",
        value: process.env.CSRF_TOKEN,
        domain: ".leetcode.com",
        path: "/",
        secure: true
      }
    );

    // 🧠 Step 3: Reload to activate session
    await page.reload({ waitUntil: "networkidle2" });

    // 🧠 Step 4: Go to problem
    console.log("Opening problem...");

    await page.goto("https://leetcode.com/problems/two-sum/", {
      waitUntil: "networkidle2"
    });

    // ❗ Detect login failure
    if (page.url().includes("login")) {
      await page.screenshot({ path: "debug.png" });
      console.log("❌ LOGIN FAILED (cookies invalid)");
      return;
    }

    console.log("Waiting for editor...");

    // 🧠 Flexible selector
    await page.waitForSelector("textarea, .monaco-editor", {
      timeout: 25000
    });

    console.log("Injecting code...");

    await page.evaluate(() => {
      const textarea = document.querySelector("textarea");
      if (textarea) {
        textarea.value = `
class Solution {
  twoSum(nums, target) {
    return [0,1];
  }
}
        `;
      }
    });

    await new Promise(r => setTimeout(r, 3000));

    console.log("Submitting...");

    const btn = await page.$('button[data-cy="submit-code-btn"]');

    if (!btn) {
      await page.screenshot({ path: "debug.png" });
      console.log("❌ Submit button not found");
      return;
    }

    await btn.click();

    await new Promise(r => setTimeout(r, 8000));

    console.log("✅ Submitted successfully");

  } catch (err) {
    console.log("❌ ERROR:", err.message);
  } finally {
    if (browser) await browser.close();
  }
}

// -----------------------------
// 🚀 MAIN
// -----------------------------
(async () => {
  console.log("Env check:", !!process.env.LEETCODE_SESSION, !!process.env.CSRF_TOKEN);

  const submitted = await checkSubmittedToday();

  if (submitted) {
    console.log("✅ Already solved today");
    return;
  }

  console.log("❌ Not solved today → attempting submit");

  await submitSolution();
})();
