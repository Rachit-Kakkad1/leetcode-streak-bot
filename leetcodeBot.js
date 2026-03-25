const axios = require("axios");
const puppeteer = require("puppeteer");

async function checkSubmittedToday() {
  try {
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

async function submitSolution() {
  console.log("Launching browser...");

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();

  console.log("Setting cookies...");

  await page.setCookie(
    {
      name: "LEETCODE_SESSION",
      value: process.env.LEETCODE_SESSION,
      domain: ".leetcode.com"
    },
    {
      name: "csrftoken",
      value: process.env.CSRF_TOKEN,
      domain: ".leetcode.com"
    }
  );

  console.log("Opening problem...");

  await page.goto("https://leetcode.com/problems/two-sum/", {
    waitUntil: "networkidle2"
  });

  // Wait for editor (more reliable than textarea)
  await page.waitForSelector('[data-cy="code-editor"]', { timeout: 15000 });

  console.log("Injecting code...");

  await page.evaluate(() => {
    const editor = document.querySelector('[data-cy="code-editor"]');
    if (editor) {
      editor.innerText = `
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

  await page.click('button[data-cy="submit-code-btn"]');

  await new Promise(r => setTimeout(r, 5000));

  console.log("Submitted!");

  await browser.close();
}

(async () => {
  console.log("Checking submission...");

  const submitted = await checkSubmittedToday();

  if (submitted) {
    console.log("Already solved today ✅");
    return;
  }

  console.log("No submission today ❌ → submitting...");

  await submitSolution();
})();
