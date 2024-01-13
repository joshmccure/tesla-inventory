import { exec } from 'child_process';

export function sendPushNotification(carModel, location, results, newCars, callback) {
    console.log(carModel, location)
    if (results.length == 1) {
        exec(`/usr/bin/osascript -e \'display notification "${results[0].name}, ${results[0].price}" with title "Tesla ${carModel} Found! - ${location}" sound name "Hero"\'`);
    }
    else {
        exec(`/usr/bin/osascript -e \'display notification "${results.length} Tesla ${carModel} in ${location} matching your criteria" with title "Tesla Inventory Found!" sound name "Hero"\'`);
    }
}

