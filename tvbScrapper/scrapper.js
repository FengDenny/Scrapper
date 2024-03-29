import puppeteer from "puppeteer";
import { readDataFromFile, checkFileData } from './dataCreation.js';
async function setupPage(url) {
  const browser = await puppeteer.launch({headless:false, defaultViewport:null});
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(60000);  // allow more time for the page to load for big data
  await page.goto(url);
  return { browser, page };
}

async function closeBrowser(browser) {
  return browser.close();
}

async function extractPageHeader(page){
  const headerData = await page.evaluate( () => {
     let header = document.querySelector(".collection-header")?.textContent.trim() 
     return header
  })
  return headerData
 }
 

async function processData(page, drama, dramasMap) {
  const { title, imgSrc, hrefLink } = drama;

  if (!dramasMap.has(title)) {
    dramasMap.set(title, []);
  }

  const lookupDrama = dramasMap.get(title);
  if (!lookupDrama.some((item) => item.imgSrc === imgSrc)) {
    lookupDrama.push({ imgSrc, link: hrefLink });
  }

  for (const dramaItem of lookupDrama) {
    const dramaHref = dramaItem.link;
    try {
      await page.goto(dramaHref);
      const bannerImgSrc = await page.evaluate(() => {
        const bannerDiv = document.querySelector(".banner-div");
        if (bannerDiv) {
          const imgElement = bannerDiv.querySelector("img");
          if (imgElement) return imgElement.getAttribute("src");
        }
        return null;
      });

      lookupDrama.forEach((drama) => drama.banner = bannerImgSrc);

    } catch (error) {
      console.error("Error fetching document:", error);
    }
  }
}


async function extractDramasData(page) {
  const dramasMap = new Map();

  const dramaElements = await page.evaluate(() => {
    const dramas = Array.from(document.querySelectorAll('.drama'));
    return dramas.map(drama => {
      const link = drama.querySelector('a');
      if (!link) {
        console.error("Link element not found in drama:", drama);
        return null;
      }
      
      const titleElement = link.querySelector('.title');
      const imgElement = link.querySelector('img');

      if (titleElement && imgElement) {
        const title = titleElement.textContent.trim();
        const imgSrc = imgElement.getAttribute('src');
        const hrefLink = link.href;
        return { title, imgSrc,  hrefLink };
      } else {
        console.error("Title or image element not found in drama:", drama);
        return null;
      }
    }).filter(Boolean); // Ensures that only valid data (non-null) is included in the resulting array.
  });

  for (const drama of dramaElements) {
    if (!drama) continue;
    await processData(page, drama, dramasMap);
  }

  return Object.fromEntries(dramasMap);
}

async function retrieveAllDataWithHeader(url, dataFile){
  try {
    const { browser, page } = await setupPage(url);
    const headerData = await extractPageHeader(page)
    const dramasData = await extractDramasData(page)
    const dramasArray = [dramasData]
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
