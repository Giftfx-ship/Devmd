const axios = require('axios')
const chalk = require('chalk')

const repourl = 'https://github.com/Giftfx-ship/Devmd' // your GitHub repo URL in lowercase

async function checkgithubupdate() {
  try {
    const commitsurl = repourl.replace(/\/$/, '') + '/commits/main'
    const res = await axios.get(commitsurl)
    if (res.status === 200) {
      console.log(chalk.cyan(`[githubupdate] latest commit fetched successfully from ${repourl}`))
    }
  } catch (error) {
    console.error(chalk.red(`[githubupdate] failed to fetch latest commit: ${error.message}`))
  }
}

// Initial check immediately
checkgithubupdate()

// Schedule to run every 16 hours (16 * 60 * 60 * 1000 ms)
setInterval(() => {
  checkgithubupdate()
}, 16 * 60 * 60 * 1000)

module.exports = { checkgithubupdate }
