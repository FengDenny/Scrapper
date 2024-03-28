import puppeteer from "puppeteer";
import { readDataFromFile, checkFileData } from './dataCreation.js';
async function setupPage(url) {
  const browser = await puppeteer.launch({headless:false, defaultViewport:null});
  const page = await browser.newPage();
  await page.goto(url);
  return { browser, page };
}

async function closeBrowser(browser) {
  return browser.close();
}

async function extractPageHeader(page){
 const headerData = await page.evaluate(() => {
    let header = document.querySelector(".collection-header")?.textContent.trim() 
    return header
 })
 return headerData
}

async function extractDramasData(page, ) {
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
      return Object.fromEntries(dramasMap) ;
  });
  return data;
}

async function retrieveAllDataWithHeader(url, dataFile){
  try {
    const { browser, page } = await setupPage(url);
    const dramasData = await extractDramasData(page)
    const headerData = await extractPageHeader(page)
    const dramasArray = new Array()
    dramasArray.push(dramasData)
    const data = { header: headerData, dramas: dramasArray };
    await closeBrowser(browser);
    const existingData = readDataFromFile(dataFile)
    const newDataString = JSON.stringify(existingData, null, 2)
    checkFileData(dataFile, existingData, newDataString, data)
    return newDataString
  } catch (error) {
    console.error("Error retrieving data:", error);
    return {};
  }
}


async function retrieveAllShowsData(url) {
  const dataFile = "allShowsData.json";
  return await retrieveAllDataWithHeader(url, dataFile)
}

async function retrieveNewestCollections(url){
   const dataFile = "2024DramaCollections.json"
   return await retrieveAllDataWithHeader(url, dataFile)
}

const tvbUrlEnglish = "https://tvbanywherena.com/english";
const tvbURL2024Collections ="https://tvbanywherena.com/english/collections/USA_2024"

retrieveAllShowsData(tvbUrlEnglish)
  .then((result) => {
    const data = JSON.parse(result);
    console.log(`Dramas: ${JSON.stringify(data.dramas, null, 2)}`)
  })
  .catch((error) => console.error(`Error: ${error}`));

retrieveNewestCollections(tvbURL2024Collections)
  .then((result) => {
    const data = JSON.parse(result);
    console.log(`Newest Collections - ${data.header}`); 
    console.log(`Dramas: ${JSON.stringify(data.dramas, null, 2)}`)
  })
  .catch((error) => console.error(`Error: ${error}`));
