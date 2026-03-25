const axios = require("axios");
const puppeteer = require("puppeteer");

// -----------------------------
// ✅ CHECK LEETCODE SUBMISSION
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
      console.log("No submissions found or not logged in");
      return false;
    }

    const last = list[0].timestamp;
    const now = Math.floor(Date.now() / 1000);

    return (now - last) < 86400;

  } catch (err) {
    console.log("Error fetching submissions:", err.message);
    return false;
  }
}

// -----------------------------
// ✅ SUBMIT SOLUTION
// -----------------------------
async function submitSolution() {
  console.log("Launching browser...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();

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

  console.log("Opening LeetCode homepage...");

  await page.goto("https://leetcode.com/", {
    waitUntil: "networkidle2"
  });

  console.log("Opening problem page...");

  await page.goto("https://leetcode.com/problems/two-sum/", {
    waitUntil: "networkidle2"
  });

  // ❗ Check login
  if (page.url().includes("login")) {
    await page.screenshot({ path: "debug.png" });
    throw new Error("❌ Not logged in - cookies invalid");
  }

  console.log("Waiting for editor...");

  await page.waitForSelector("textarea, .monaco-editor", {
    timeout: 20000
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

  console.log("Waiting before submit...");
  await new Promise(r => setTimeout(r, 3000));

  console.log("Clicking submit...");

  const submitBtn = await page.$('button[data-cy="submit-code-btn"]');

  if (!submitBtn) {
    await page.screenshot({ path: "debug.png" });
    throw new Error("❌ Submit button not found");
  }

  await submitBtn.click();

  await new Promise(r => setTimeout(r, 8000));

  console.log("Submitted!");

  await browser.close();
}

// -----------------------------
// 🚀 MAIN FLOW
// -----------------------------
(async () => {
  const submitted = await checkSubmittedToday();

  if (submitted) {
    console.log("Already solved today ✅");
    return;
  }

  console.log("No submission today ❌ → submitting...");

  await submitSolution();
})();
