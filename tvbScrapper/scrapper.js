import puppeteer from "puppeteer";
import { readDataFromFile, checkFileData } from "./dataCreation.js";

async function setupPage(url) {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    protocolTimeout: 0
  });
  const page = await browser.newPage();
  page.setDefaultNavigationTimeout(0); 
  await page.goto(url);
  return { browser, page };
}

async function closeBrowser(browser) {
  return browser.close();
}

async function processBannerData(page, drama){
  const dramaHref = drama.link

  try{
    await page.goto(dramaHref)
    const bannerImgSrc = await page.evaluate(() => {
      const bannerDiv = document.querySelector(".banner-div img")
      if (bannerDiv){
        const imgElement = bannerDiv.getAttribute("src")
        return imgElement ? imgElement : null
      }
    })
    drama.banner = bannerImgSrc
  }catch(error){
    console.error("Error fetching document:", error);
  }
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
    await processBannerData(page, dramaItem)
  }
}

async function extractHeaders(page) {
  const headersArray = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.container.section-header h3'))
      .map(header => header.textContent.trim());
  });

  return headersArray; 
}

async function extractDramaBySection(page, sectionNames, url) {
  const dramasData = [];

  // Iterate over each section name
  for (const sectionName of sectionNames) {
    console.log(`Processing section: ${sectionName}`);

    // Find the corresponding link for the section name
    const link = await page.evaluate((sectionName) => {
      const headerElement = Array.from(document.querySelectorAll('.container.section-header h3')).find(element => element.textContent.trim() === sectionName);
      if (headerElement) {
        const linkElement = headerElement.closest('.container.section-header').querySelector('h4 a');
        return linkElement ? linkElement.href : null;
      }
      return null;
    }, sectionName);

    if (!link) {
      console.log(`No link found for section: ${sectionName}`);
      continue;
    }

    // Go to that page and start scrapping process
    await page.goto(link);

    // Extract drama elements from the current page
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

    const dramasMap = new Map();
    
    // Process each drama element
    for (const drama of dramaElements) {
      if (!drama) continue;
      await processData(page, drama, dramasMap);
    }
    
    dramasData.push({ header: sectionName, dramas: Object.fromEntries(dramasMap) });

    // Go back to the original page before finding the next section
    await page.goto(url);
  }

  return dramasData;
}



async function retrieveHeaders(url){
  const {browser, page} = await setupPage(url)
  const headers = await extractHeaders(page)
  console.log(headers)
  await closeBrowser(browser)
  return headers
}

async function retrieveAllDataBySections(url, dataFile, sections) {
  try {
    const { browser, page } = await setupPage(url);
    const dramasData = await extractDramaBySection(page, sections, url);
    const data ={dramas:dramasData}
    await closeBrowser(browser);
    const existingData = readDataFromFile(dataFile);
    const newDataString = JSON.stringify(existingData, null, 2);
    checkFileData(dataFile, existingData, newDataString, data);
    return newDataString;
  } catch (error) {
    console.error("Error retrieving data:", error);
    return {};
  }
}

async function retrieveDataByTitle(url, dataFile) {
  const sectionNames = await retrieveHeaders(url); 
  return await retrieveAllDataBySections(url, dataFile, sectionNames.filter((title) => title === "2024 Drama" ));
}

async function retrieveAllShowsData(url) {
  const dataFile = "allShowsData.json";
  const sectionNames = await retrieveHeaders(url); 
  return await retrieveAllDataBySections(url, dataFile, sectionNames);
}

async function retrieveOddShowsData(url) {
  const dataFile = "oddShowsData.json";
  const sectionNames = await retrieveHeaders(url); 
  return await retrieveAllDataBySections(url, dataFile, sectionNames.filter((_, index) => index % 2 === 1));
}
async function retrieveCollections(url) {
  /* 
  Search for dramas of the following:    
    '2024 Drama',
    '2023 Drama',
    '2022 Drama',
    '2021 Drama',
    '2020 Drama',
    '2019 Drama',
  */
  const dataFile = "dramaCollections.json";
  const sections = await retrieveHeaders(url)
  const filterSections = sections.filter((name) => {
      const words = name.split(" ")
      for(const word of words){
        const year = parseInt(word)
        if(year >= 2000 && year <= 2099) return true
      }
      return false
  })
  return await retrieveAllDataBySections(url, dataFile, filterSections);
}




const tvbUrlEnglish = "https://tvbanywherena.com/english";

// retrieveCollections(tvbUrlEnglish);
// retrieveAllShowsData(tvbUrlEnglish)
retrieveDataByTitle(tvbUrlEnglish, "currentYearCollection.json")

