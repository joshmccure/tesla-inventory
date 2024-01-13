import puppeteer from 'puppeteer';
import inquirer from 'inquirer';
import minimist from 'minimist';
import fs from 'fs/promises';
import path from 'path';
import { sendPushNotification } from './notify.js';


const args = minimist(process.argv.slice(2));
const filePath = path.join(process.cwd(), 'previousCars.json');

async function readPreviousData() {
    try {
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      if (error.code === 'ENOENT') { return {}; }
      throw error;
    }
  }
  
  // Function to save current car data
  async function saveCurrentData(data) {
    try {
      const json = JSON.stringify(data, null, 2);
      await fs.writeFile(filePath, json, 'utf8');
    } catch (error) {
      console.error("Error saving data:", error);
    }
  }
  

const getModelAndLocation = async () => {
    const modelChoices = [
        { name: 'Model Y', value: {code: 'my', name: 'Model Y'} },
        { name: 'Model 3', value: {code: 'm3', name: 'Model 3'} },
        { name: 'Model X', value: {code: 'mx', name: 'Model X'} },
        { name: 'Model S', value: {code: 'ms', name: 'Model S'} }

    ];

    const modelArg = modelChoices.find(m => m.value.code === args.model);

    const locationChoices = [
        { name: 'Brisbane', value: { name: 'Brisbane', zip: '4000', state: 'QLD' } },
        { name: 'Gold Coast', value: { name: 'Gold Coast', zip: '4000', state: 'QLD' } } // Replace 'xxxx' with the correct zip code
    ];

    console.log(args.location)
    const locationArg = locationChoices.find(l => l.value.name.toLowerCase() === args.location?.toLowerCase());


    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'carModel',
            message: 'Select a car model:',
            choices: modelChoices,
            when: () => !args.model
        },
        {
            type: 'list',
            name: 'location',
            message: 'Select a location:',
            choices: locationChoices,
            when: () => !args.location
        }
    ]);

    return {
        carModel: modelArg ? modelArg.value : answers.carModel,
        location: locationArg ? locationArg.value : answers.location
    };
};

(async () => {
    const allPreviousCars = await readPreviousData();


    const { carModel, location } = await getModelAndLocation();
    console.log(location)

    const url = encodeURI(`https://www.tesla.com/en_AU/inventory/new/${carModel.code}?FleetSalesRegions=${location.state} - ${location.name}&arrangeby=relevance&zip=4000&range=0`);
    const browser = await puppeteer.launch({
        headless: false
    });

    const page = await browser.newPage();
    await page.goto(url);

    // Press 'Escape' to close any potential pop-ups
    await page.keyboard.press('Escape');

    try {
        await page.waitForSelector('.result-basic-info', {
            timeout: 5000 // 5 seconds timeout
        });

        const results = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('article')).map(article => {
                const basicInfoNodes = article.querySelectorAll('.result-basic-info > *');
                let basicInfo = Array.from(basicInfoNodes).slice(0, 2).map(node => node.innerText).join(' - ');
                let features = article.querySelector('.result-regular-features')?.innerText;
                const price = article.querySelector('.result-purchase-price')?.innerText.trim();
    
    
                // Clean up and format the basicInfo and features
                basicInfo = basicInfo.replace(/\n/g, ' - ').trim();
                features = features.replace(/\n/g, ', ').replace(/’’/g, '').trim();
    
                // Create an object with name and features
                return {
                    name: basicInfo,
                    features: features,
                    price: price
                };
            });
        });
    


        const previousCars = allPreviousCars[location.name] || [];
        const newCars = results.filter(car => !previousCars.some(prevCar => 
            prevCar.name === car.name && 
            prevCar.price === car.price));

        console.log(results);
        console.log(`Found ${results.length} ${carModel.name} in ${location.name}`);


        if (newCars.length > 0) {
            console.log(`${newCars.length} New cars found in ${location.name}: ${JSON.stringify(newCars, null, 2)}`);
        } else {
            console.log(`No new cars found in ${location.name} since last run.`);
        }

        sendPushNotification(carModel.name, location.name, results, newCars, (stdout, stderr, error) => {
            // You can handle the results here or perform other actions
            if (!error) {
              console.log('Notification sent');
            } else {
              console.error('Notification failed');
            }
          });

        // Update the data for the current location
        allPreviousCars[location.name] = results;
        // Save the updated data
        await saveCurrentData(allPreviousCars);
    
    
        await browser.close();

    } catch (error) {
        if (error.name === 'TimeoutError') {
            await browser.close();
            console.log(`Sorry :( \n 0 Tesla ${carModel.name} found in ${location.name}`);
        } else {
            await browser.close();
            console.error('An error occurred:', error.message);
        }
    }



    // Extract the text from the specified elements

})();
