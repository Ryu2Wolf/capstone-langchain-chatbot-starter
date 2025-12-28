function sendMessage() {
    let messageInput = document.getElementById('message-input');
    let message = messageInput.value.trim();
    
    // Don't send empty messages
    if (!message) return;
    
    displayMessage('user', message);
    
    // Show loading indicator
    showLoading(true);
    
    // Get the selected function from the dropdown menu
    let functionSelect = document.getElementById('function-select');
    let selectedFunction = functionSelect.value;
    
    // Send an AJAX request to the Flask API endpoint based on the selected function
    let xhr = new XMLHttpRequest();
    let url;

    switch (selectedFunction) {
        case 'search':
            url = '/search';
            break;
        case 'kbanswer':
            url = '/kbanswer';
            break;
        case 'answer':
            url = '/answer';
            break;
        default:
            url = '/answer';
    }
    
    xhr.open('POST', url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        // Hide loading indicator
        showLoading(false);
        
        if (xhr.status === 200) {
            let response = JSON.parse(xhr.responseText);
            displayMessage('assistant', response.message);
        } else {
            displayMessage('assistant', 'Sorry, there was an error processing your request.');
        }
    };
    xhr.onerror = function() {
        showLoading(false);
        displayMessage('assistant', 'Sorry, there was a network error.');
    };
    xhr.send(JSON.stringify({message: message}));
    
    // Clear the input field
    messageInput.value = '';
}

function showLoading(show) {
    let loadingIndicator = document.getElementById('loading-indicator');
    if (show) {
        loadingIndicator.style.display = 'block';
    } else {
        loadingIndicator.style.display = 'none';
    }
}

function displayMessage(sender, message) {
    let chatContainer = document.getElementById('chat-container');
    let messageDiv = document.createElement('div');

    if (sender === 'assistant') {
        messageDiv.classList.add('assistant-message');
        
        // Create message header with label and copy button
        let headerDiv = document.createElement('div');
        headerDiv.classList.add('message-header');
        
        let labelSpan = document.createElement('span');
        labelSpan.classList.add('message-label');
        labelSpan.innerHTML = "<b>⚛️ Ziggy:</b>";
        
        let copyBtn = document.createElement('button');
        copyBtn.classList.add('copy-btn');
        copyBtn.innerHTML = '📋 Copy';
        copyBtn.onclick = function() { copyToClipboard(message, copyBtn); };
        
        headerDiv.appendChild(labelSpan);
        headerDiv.appendChild(copyBtn);
        messageDiv.appendChild(headerDiv);
        
        // Create message content with markdown rendering
        let contentDiv = document.createElement('div');
        contentDiv.classList.add('message-content');
        contentDiv.innerHTML = marked.parse(message);
        
        messageDiv.appendChild(contentDiv);
    } else {
        messageDiv.classList.add('user-message');

        let userSpan = document.createElement('span');
        userSpan.innerHTML = "<b>You:</b> ";
        messageDiv.appendChild(userSpan);
        
        // Append the message to the span
        let textNode = document.createTextNode(message);
        messageDiv.appendChild(textNode);
    }

    // Create a timestamp element
    let timestamp = document.createElement('span');
    timestamp.classList.add('timestamp');
    let currentTime = new Date().toLocaleTimeString();
    timestamp.innerText = " ["+ currentTime+"]";
    messageDiv.appendChild(timestamp);

    chatContainer.appendChild(messageDiv);

    // Scroll to the bottom of the chat container (smooth scroll)
    chatContainer.scrollTop = chatContainer.scrollHeight;
}

function copyToClipboard(text, button) {
    // Remove markdown formatting for plain text copy
    let plainText = text
        .replace(/\*\*/g, '')  // Remove bold
        .replace(/\*/g, '')    // Remove italics
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/`/g, '');    // Remove code formatting
    
    navigator.clipboard.writeText(plainText).then(function() {
        // Change button text to show success
        button.innerHTML = '✅ Copied!';
        button.classList.add('copied');
        
        // Reset button after 2 seconds
        setTimeout(function() {
            button.innerHTML = '📋 Copy';
            button.classList.remove('copied');
        }, 2000);
    }).catch(function(err) {
        console.error('Failed to copy text: ', err);
        button.innerHTML = '❌ Failed';
        setTimeout(function() {
            button.innerHTML = '📋 Copy';
        }, 2000);
    });
}

function clearChat() {
    let chatContainer = document.getElementById('chat-container');
    chatContainer.innerHTML = '';
    displayMessage('assistant', 'Chat cleared! How can I help you today?');
}

// Handle button click events
let sendButton = document.getElementById('send-btn');
sendButton.addEventListener('click', sendMessage);

let clearButton = document.getElementById('clear-btn');
clearButton.addEventListener('click', clearChat);

// Handle Enter key press in input field
let messageInput = document.getElementById('message-input');
messageInput.addEventListener('keypress', function(event) {
    if (event.key === 'Enter') {
        sendMessage();
    }
});

// Display welcome message on page load
window.addEventListener('load', function() {
    displayMessage('assistant', 'Hello! I\'m Ziggy, your Quantum Computing assistant. Ask me anything about quantum computing, or search my knowledge base!');
});
