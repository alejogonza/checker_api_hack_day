$(function() {
  const session = {}
  session.tasks = []

  console.log('CheckerBuddy Loading...')

  $('div#failing').hide()
  $('div#showing').hide()
  $('div#failing-project').hide()
  $('div.project-container').hide()

  const correctionFunc = function(taskId) {
    console.log('correctionFunc() taskId:', taskId)
    const correctionRequest = {
      async: true,
      crossDomain: true,
      url: `https://intranet.hbtn.io/tasks/${taskId}/start_correction.json?auth_token=${session.auth_token}`,
      method: 'POST',
      statusCode: {
        429: function() {
          alert('Exceeded request limit! Please try again in an hour.')
        }
      }
    }
    $.ajax(correctionRequest).done(function(data) {
      console.log('CORRECTION:', data)
      session.tasks[taskId] = data.id

      console.log('SHOWING...')
      $(`.task_button[task-id=${taskId}]`)
        .find('.lds-heart')
        .show()
      const pollResult = function() {
        console.log('POLLING:', data.id)
        const resultRequest = {
          async: true,
          crossDomain: true,
          url: `https://intranet.hbtn.io/correction_requests/${data.id}.json?auth_token=${session.auth_token}`,
          method: 'GET'
        }
        $.ajax(resultRequest).done(function(data) {
          console.log('POLL RESULT:', data)
          if (data.status !== 'Done') {
            setTimeout(pollResult, 2000)
          } else {
            /* collect checker data */
            const requirements = []
            const outputs = []
            for (const check of data.result_display.checks) {
              if (check.check_label === 'requirement') {
                requirements.push(check.passed)
              } else if (check.check_label === 'code') {
                outputs.push(check.passed)
              }
            }
            const requirementsStr = requirements
              .map(x => (x ? '✅' : '❌'))
              .join('')
            const outputsStr = outputs.map(x => (x ? '✅' : '❌')).join('')

            /* Append data to task list element */
            $('.task_button').each(function(index) {
              if ($(this).attr('task-id') === data.task_id.toString()) {
                const msgStr = outputMessage(getScore(data))
                $(`.task_button[task-id=${taskId}]`)
                  .find('.lds-heart')
                  .hide()
                $(this)
                  .children('.results')
                  .remove()
                $(this)
                  .children('.msg')
                  .remove()
                $(this).append(
                  `<div class="results"><i>Requirements: ${requirementsStr}</i></div>`
                )
                $(this).append(
                  `<div class="results"><i>Outputs: ${outputsStr}</i></div>`
                )
                $(this).append(`<h4 class="msg">${msgStr}</h4>`)
                if (msgStr === 'You have all green checks!') {
                  const elem =
                    messageDict[msgStr][
                      Math.floor(Math.random() * messageDict[msgStr].length)
                    ]
                  $(this).append(`<p class="msg">    ${elem}</p>`)
                } else {
                  messageDict[msgStr].forEach(elem => {
                    $(this).append(`<p class="msg">    ${elem}</p>`)
                  })
                }
              }
            })
          }
        })
      }
      pollResult()
    })
  }

  $(document).on('click', 'input[value=Next]', function() {
    console.log('LOGIN')
    $('div#failing').hide()
    $('div#showing').hide()
    $('#validating').fadeOut(300, function() {
      $('#validating').fadeOut(300)
    })
    const json = {
      api_key: $('input[name=api]').val(),
      email: $('input[name=email]').val(),
      password: $('input[name=password]').val(),
      scope: 'checker'
    }

    const authenticationRequest = {
      async: true,
      crossDomain: true,
      url: 'https://intranet.hbtn.io/users/auth_token.json',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      data: JSON.stringify(json)
    }
    $.ajax(authenticationRequest)
      .done(function(data) {
        console.log('AUTH:', data)
        if (data.auth_token) {
          session.auth_token = data.auth_token
          setTimeout(() => $('div#showing').show(), 200)
          $('input[name=next]').val('Play')
        }
      })
      .fail(() => {
        $('div#showing').hide()
        setTimeout(() => $('div#failing').show(), 500)
      })
  })

  $(document).on('click', 'input[value=Play]', function() {
    const projectId = $('input[name=project]').val()
    console.log('Play:', projectId)
    $('div.project-container').hide()
    $('div#failing-project').hide()

    const projectRequest = {
      async: true,
      crossDomain: true,
      url: `https://intranet.hbtn.io/projects/${projectId}.json?auth_token=${session.auth_token}`,
      method: 'GET'
    }
    $.ajax(projectRequest)
      .done(function(data) {
        console.log('PROJECT:', data)
        $('div.project-container').show()
        $('div#failing-project').hide()
        $('.tasks_container').empty()
        $('.tasks_container').append(
          `<button class="list-group-item list-group-item-action active" id="task_header" type="button"><h3>${data.name}</h3></button>`
        )
        let i = 0
        for (const task of data.tasks) {
          $('.tasks_container').append(
            `<button type="button" class="list-group-item list-group-item-action task_button" task-id='${
              task.id
            }'><h4><u>${i++}. ${
              task.title
            }</u></h4><div style="float: right; display: none;" class="lds-heart"><div></div></div></button>`
          )
        }
      })
      .fail(() => {
        console.log('FAIL!')
        $('div.project-container').hide()
        setTimeout(() => $('div#failing-project').show(), 500)
      })
  })

  $(document).on('click', '.task_button', function() {
    correctionFunc($(this).attr('task-id'))
  })

  $(document).on('click', '#task_header', function() {
    $('.task_button').each((i, e) => correctionFunc(e.getAttribute('task-id')))
  })
})

const messageDict = {
  'You have all green checks!': [
    'Congratulations :)',
    'Good work buddy!',
    'Wow, that hard work really paid off!',
    'Nice job! Now go help your peers ;)'
  ],
  'You have all red checks.': [
    'Is your GitHub repo set up with the correct name? The checker might not find it.',
    'Is the file pushed to the master branch? The checker clones your repo from master.',
    'Is the file for this task named correctly? Do you have a README that is not empty?'
  ],
  'Only the first check is green.': [
    'Does your program compile locally with no errors or warning? Make sure to run gcc with the flags -Wall -Werror -pedantic -Wextra.',
    'Do you have the same gcc (or python) version as the project requirements? Your program might compile and run locally but not on the checker side.',
    'Is there a segmentation fault, or timeout?'
  ],
  'All the output checks are red, but all the requirement checks are green.': [
    'Try piping your program in the command "cat -e" to make sure there is not trailing whitespace: "./a.out | cat -e". You can also use "diff" on your output and the example output.',
    'Is your file executable? Did you run "chmod u+x" on your file?',
    'Did you think of all the edge cases? You can collaborate with your peers and change the main file provided as an example.'
  ],
  'You have one or more requirement red checks.': [
    'Do you have comments/documentation? Are your header files include-guarded (if applicable)?',
    'Are your files betty compliant, even the header files? (or pep8, shellcheck etc...)',
    'Do you have a shebang (Python/Shell)? Do you have a new line at the end of your file?'
  ],
  'You have one or more output red checks.': [
    'Did you think about all the edge cases? You can collaborate with your peers and change the main file provided as an example.',
    'Did you check if Valgrind passes with no memory leaks or errors (if applicable)?',
    'Did you test your code in a container (if you have access to one, it is a great way of reproducing the checker environment)?'
  ],
  'No checks on this assignment.': ['On to the next one!']
}

// calculates score based on given data set
const getScore = data => {
  return data.result_display.checks.reduce(
    (obj, el) => {
      if (el.check_label === 'requirement') {
        obj.req.total++
        el.passed ? obj.req.pass++ : null
      } else if (el.check_label === 'code') {
        obj.output.total++
        el.passed ? obj.output.pass++ : null
      }
      return obj
    },
    { req: { total: 0, pass: 0 }, output: { total: 0, pass: 0 } }
  )
}

// returns output message based on given score
const outputMessage = score => {
  const { req, output } = score
  if (!req.total && !output.total) return 'No checks on this assignment.'
  if (req.pass === req.total && output.pass === output.total)
    return 'You have all green checks!'
  if (!req.pass && !output.pass) return 'You have all red checks.'
  if (req.pass === 1 && !output.pass) return 'Only the first check is green.'
  if (req.pass === req.total && !output.pass)
    return 'All the output checks are red, but all the requirement checks are green.'
  if (req.pass < req.total && output.pass === output.total)
    return 'You have one or more requirement red checks.'
  if (req.pass === req.total && output.pass < output.total)
    return 'You have one or more output red checks.'
}
