import fs from "fs"

 function readDataFromFile(filePath) {
    if (fs.existsSync(filePath)) {
        const dataString = fs.readFileSync(filePath, "utf8");
        return JSON.parse(dataString);
    }
    return {};
}

function writeDataToFile(filePath, data) {
    const dataString = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, dataString);
    console.log(`Data saved to ${filePath}`);
}

function checkFileData(file, existing, newData, data){
    if(newData !== existing){
      writeDataToFile(file, data)
    } else {
      console.log("Data in file is up to date, no changes made");
    }

    return newData
}

export {readDataFromFile, writeDataToFile, checkFileData}