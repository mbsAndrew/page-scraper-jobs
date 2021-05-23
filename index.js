require("dotenv").config();
const axios = require("axios");
const cheerio = require("cheerio");
const schedule = require("node-schedule");
const nodemailer = require("nodemailer");
const { URL, ENTRYPOINT, EMAIL_USER, EMAIL_PASS, EMAIL_REC, PORT } = process.env;

//set up rule to send the email every weekday at 9:30
const rule = new schedule.RecurrenceRule();
rule.dayOfWeek = [1, 5];
rule.hour = 9;
rule.minute = 30;
const job = schedule.scheduleJob(rule, () => {
    initFunc()
});

async function initFunc() {
    const pageInfo = await getPageInfo();  
    console.log("pageInfo", pageInfo);  
    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: EMAIL_USER,
            pass: EMAIL_PASS
        }
    });
    let mailOptions = {
        from: EMAIL_USER,
        to: EMAIL_REC,
        subject: `Total Jobs today: ${pageInfo.length}`    
    }
    if (pageInfo.length > 0) {
        //send email with content     
        mailOptions.html = formatDataToList(pageInfo);
    } else {
        mailOptions.text = "No jobs today, sorry!";
    }

    transporter.sendMail(mailOptions, (err, info) => {
        console.log("info", info);
        console.log(err ? err : info.response);
    })
}

function formatDataToList(data) {
    return `<ul>${data.map(m => {
        return `<li><a href=${m.application}>${m.title}</a> for ${m.department}. 
            Last day to apply: ${m.closing}</li>`;
    }
    )}</ul>`;
}

async function getPageInfo () {
    return new Promise((res, rej) => {
        axios(URL)
            .then(response => {
                const { data } = response;                
                const $ = cheerio.load(data);
                const tableRows = $(ENTRYPOINT);
                const softwareJobs = [];

                tableRows.each((index, element) => {
                    if (index > 0) {
                        const titleCell = $(element.children[3]).text();
                        const department = $(element.children[4]).text();
                        const closingDate = $(element.children[7]).text();
                        const application = $(element.children[1]).find("img").attr("onclick").split("'");
                        const finalLink = `${URL}${application[1]}`;

                        if (titleCell.includes("Software")) {
                            softwareJobs.push({
                                closing: closingDate,
                                department: department,
                                title: titleCell,
                                application: finalLink
                            })
                        }
                    }
                });
                res(softwareJobs);
            })
            .catch(err => console.log(err));
    });
}