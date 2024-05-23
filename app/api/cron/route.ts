export const dynamic = 'force-dynamic'; // static by default, unless reading the request
import { NextResponse } from 'next/server';
import { parseStringPromise } from 'xml2js';
const webUrl = 'https://hooks.slack.com/services/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'

async function getRecentJobPosts(xml: string): Promise<any[]> {
    try {
        const trimmedXml = xml.trim();
        const result = await parseStringPromise(trimmedXml);
        const jobItems = result.rss.channel[0].item;
        const recentJobPosts: any[] = [];
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);

        jobItems.forEach((item: any) => {
            const pubDate = new Date(item.pubDate[0]);
            if (pubDate > oneMinuteAgo) {
                recentJobPosts.push({
                    title: item.title[0],
                    link: item.link[0],
                    description: item.description[0],
                    pubDate: item.pubDate[0],
                    category: item.category ? item.category[0] : 'N/A',
                    skills: item['content:encoded'][0].match(/<b>Skills<\/b>:(.*?)<br \/>/s)?.[1].trim() || 'N/A',
                    country: item['content:encoded'][0].match(/<b>Country<\/b>:(.*?)<br \/>/s)?.[1].trim() || 'N/A'
                });
            }
        });

        return recentJobPosts;
    } catch (error) {
        console.error('Error parsing XML:', error);
        throw error;
    }
}


async function postJobsToSlack(webhookUrl: string, jobs: any[]): Promise<void> {
    console.log('jobs length', jobs.length)
    try {
        for (const job of jobs) {
            const message = {
                text: `*${job.title}*\n${job.description}\n*Link:* ${job.link}\n*Posted On:* ${job.pubDate}\n*Category:* ${job.category}\n*Skills:* ${job.skills}\n*Country:* ${job.country}`
            };
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(message)
            
            });
        }
        console.log('Jobs posted to Slack successfully');
    } catch (error) {
        console.error('Error posting jobs to Slack:');
        throw error;
    }
}
export async function GET(request: Request) {
    console.log('called')
    const feedUrl = 'https://www.upwork.com/ab/feed/jobs/rss?contractor_tier=3&paging=NaN-undefined&q=android&sort=recency&api_params=1&securityToken=2fe774a0895b01f6f1c64bb9a1e3fc7c8895e50b360f17474ee615a5de763576ff2bace7a23b92b1c28e112bcc390733541dbf0ca5c276da5e4a6514f885be20&userUid=1324478139637858304&orgUid=1324478139642052609'
    const feedString = await fetch(feedUrl).then(response => response.text());
    const jobs = await getRecentJobPosts(feedString);   
    console.log('webUrl', webUrl )
    await postJobsToSlack(webUrl!, jobs);
    return NextResponse.json({ ok: true });
}