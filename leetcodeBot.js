const axios = require("axios");

async function checkSubmittedToday() {
  const res = await axios.post("https://leetcode.com/graphql", {
    query: `query { recentSubmissionList(limit: 1) { timestamp } }`
  });

  const last = res.data.data.recentSubmissionList[0].timestamp;
  const now = Math.floor(Date.now() / 1000);

  return (now - last) < 86400;
}

const puppeteer = require("puppeteer");

async function submitSolution() {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  // Inject cookies
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

  await page.goto("https://leetcode.com/problems/two-sum/");

  await page.waitForSelector('textarea');

  await page.evaluate(() => {
    document.querySelector("textarea").value = `
    class Solution {
      twoSum(nums, target) {
        return [0,1];
      }
    }
    `;
  });

  await page.click('button[data-cy="submit-code-btn"]');

  await page.waitForTimeout(5000);

  await browser.close();
}

(async () => {
    const submitted = await checkSubmittedToday();
  
    if (submitted) {
      console.log("Already solved today ✅");
      return;
    }
  
    console.log("No submission today ❌ → submitting...");
  
    await submitSolution();
  })();