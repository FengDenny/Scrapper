import puppeteer from "puppeteer";
import fs from "fs";

async function setupPage(url) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto(url);
  return { browser, page };
}

async function closeBrowser(browser) {
  return browser.close();
}

async function retrieveData(url) {
  try {
    const { browser, page } = await setupPage(url);
    const data = await page.evaluate(() => {
      const dramasMap = new Map(); // Use a Map to store image source URLs for each title
      document.querySelectorAll(".drama").forEach((drama) => {
        const link = drama.querySelector("a");
        if (link) {
          const titleElement = link.querySelector(".title");
          const imgElement = link.querySelector("img");
          if (titleElement && imgElement) {
            const title = titleElement.textContent.trim();
            const imgSrc = imgElement.getAttribute("src");
            if (!dramasMap.has(title)) {
              dramasMap.set(title, []); // Use title as key
            }
            const imgSrcArray = dramasMap.get(title);
            if (!imgSrcArray.some((item) => item.imgSrc === imgSrc)) {
              imgSrcArray.push({ imgSrc }); // Push imgSrc to array associated with title if not already present
            }
          } else {
            console.error("Title or image element not found in drama:", drama);
          }
        } else {
          console.error("Link element not found in drama:", drama);
        }
      });
      return Object.fromEntries(dramasMap); // Convert Map to a regular object
    });
    await closeBrowser(browser);

    const dataStringified = JSON.stringify(data, null, 2);
    // Read existing data from file
    let existingData = {};
    if (fs.existsSync("data.json")) {
      const existingDataString = fs.readFileSync("data.json", "utf8");
      existingData = JSON.parse(existingDataString);
    }

    // Compare existing data with new data
    const newDataString = dataStringified;
    const existingDataString = JSON.stringify(existingData, null, 2);
    if (newDataString !== existingDataString) {
      // Write data to JSON file only if it's different
      fs.writeFileSync("data.json", newDataString);
      console.log("Data saved to data.json");
    } else {
      console.log("Data in file is up to date, no changes made");
    }

    return dataStringified;
  } catch (error) {
    console.error("Error retrieving data:", error);
    return {};
  }
}

const tvbUrl = "https://tvbanywherena.com/english";

retrieveData(tvbUrl)
  .then((result) => console.log(`Data: ${result}`))
  .catch((error) => console.error(`Error: ${error}`));
