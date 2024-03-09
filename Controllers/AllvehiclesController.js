const fs = require('fs').promises;
const path = require('path');
const puppeteer = require('puppeteer');
const puppeteerConfig = require('../puppeteer.config.cjs');
const ejs = require('ejs');
const reqForm = require('../models/request');
const User = require('../models/user');
const Vehicle = require('../models/vehicle')

module.exports.print = async (req, res) => {

// Get the month and year from the request body
const month = parseInt(req.body.month);
const year = parseInt(req.body.year);

if (isNaN(month)) {
    const vehicles = await Vehicle.find();
    const filteredVehicles = vehicles.filter(vehicle => {
        // Split the dateIssued string into components
        const [mm, dd, yyyy] = vehicle.dateIssued.split('-');
        // Convert to numbers and compare with the provided year
        return parseInt(yyyy) === year;
    });
    const templatePath = path.join(__dirname, '../views/pdf/pdf-print-all.ejs');
    const templateContent = await fs.readFile(templatePath, 'utf-8');
    const html = ejs.render(templateContent, { vehicles: filteredVehicles, year:year, });
    try {
        const browser = await puppeteer.launch({
            ...puppeteerConfig,
            args: [
                "--disable-setuid-sandbox",
                "--no-sandbox",
                "--single-process",
                "--no-zygote",
            ],
            headless: true
        });

        const page = await browser.newPage();
        await page.setContent(html);
        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
        });

        // Set response headers to indicate PDF content
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', 'inline; filename="pdf-print-all.pdf"');

        // Send the PDF content as the response
        res.send(pdfBuffer);
    } catch (err) {
        console.log('err:', err);
        req.flash('message', 'Internal error occured.');
        return res.status(500).render('500');
    }
} else {
    const vehicles = await Vehicle.find();
    
    const filteredVehicles = vehicles.filter(vehicle => {
        // Split the dateIssued string into components
        const [mm, dd, yyyy] = vehicle.dateIssued.split('-');
        // Convert to numbers and compare with the provided month and year
        return parseInt(mm) === month && parseInt(yyyy) === year;
    });
    
    // Now filteredVehicles contains the vehicles issued in the specified month and year
    
        
        const templatePath = path.join(__dirname, '../views/pdf/pdf-print.ejs');
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const html = ejs.render(templateContent, { filteredVehicles: filteredVehicles, month:month, year:year, });
        try {
            const browser = await puppeteer.launch({
                ...puppeteerConfig,
                args: [
                    "--disable-setuid-sandbox",
                    "--no-sandbox",
                    "--single-process",
                    "--no-zygote",
                ],
                headless: true
            });
    
            const page = await browser.newPage();
            await page.setContent(html);
            const pdfBuffer = await page.pdf({
                format: 'A4',
                printBackground: true,
            });
    
            // Set response headers to indicate PDF content
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="pdf-print.pdf"');
    
            // Send the PDF content as the response
            res.send(pdfBuffer);
        } catch (err) {
            console.log('err:', err);
            req.flash('message', 'Internal error occured.');
            return res.status(500).render('500');
        }
    
}
}