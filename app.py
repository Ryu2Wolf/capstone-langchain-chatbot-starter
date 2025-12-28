from flask import Flask, render_template, request, jsonify
from langchain_cohere import ChatCohere, CohereEmbeddings
from langchain_community.vectorstores import Chroma
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain, RetrievalQA
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

# Initialize Cohere LLM and memory for chatbot
llm = ChatCohere(cohere_api_key=os.environ.get("COHERE_API_KEY"))
memory = ConversationBufferMemory(return_messages=True)

# Global variables for lazy loading
qa = None
vectordb = None

def load_db():
    """
    Lazy load the Chroma database with CohereEmbeddings.
    Returns a RetrievalQA chain for question answering.
    """
    global qa
    if qa is not None:
        return qa
    
    try:
        print("Loading Chroma database...")
        embeddings = CohereEmbeddings(
            cohere_api_key=os.environ["COHERE_API_KEY"],
            model="embed-english-light-v2.0"
        )
        vectordb_local = Chroma(persist_directory='content/db', embedding_function=embeddings)
        llm_kb = ChatCohere(cohere_api_key=os.environ["COHERE_API_KEY"])
        qa = RetrievalQA.from_chain_type(
            llm=llm_kb,
            chain_type="stuff",
            retriever=vectordb_local.as_retriever(search_kwargs={"k": 3}),
            return_source_documents=True
        )
        print("Database loaded successfully")
        return qa
    except Exception as e:
        print("Error loading database:", e)
        return None

def load_vectordb():
    """
    Lazy load vectordb for search functionality.
    """
    global vectordb
    if vectordb is not None:
        return vectordb
    
    try:
        print("Loading vectordb for search...")
        embeddings_for_search = CohereEmbeddings(
            cohere_api_key=os.environ.get("COHERE_API_KEY"),
            model="embed-english-light-v2.0"
        )
        vectordb = Chroma(persist_directory='content/db', embedding_function=embeddings_for_search)
        print("Vectordb loaded successfully")
        return vectordb
    except Exception as e:
        print(f"Error loading vectordb for search: {e}")
        return None

def answer_from_knowledgebase(message):
    """
    Answer questions using the knowledge base via RetrievalQA.
    Returns the answer from the documents.
    """
    try:
        qa_chain = load_db()
        if qa_chain is None:
            return "Knowledge base not available. Please ensure the 'content/db' folder exists."
        res = qa_chain.invoke({"query": message})
        return res['result']
    except Exception as e:
        return f"Error: {str(e)}"

def search_knowledgebase(message):
    """
    Search the knowledge base and return source documents.
    Returns formatted source documents as a string.
    """
    try:
        vdb = load_vectordb()
        if vdb is None:
            return "Knowledge base not available. Please ensure the 'content/db' folder exists."
        
        # Use similarity search to get relevant documents
        docs = vdb.similarity_search(message, k=3)
        
        if not docs:
            return "No sources found."
        
        sources = ""
        for count, doc in enumerate(docs, 1):
            sources += f"Source {count}\n{doc.page_content}\n\n"
        return sources
    except Exception as e:
        return f"Error: {str(e)}"

def answer_as_chatbot(message):
    """
    Answer general user questions using LangChain chat prompt template.
    Uses ConversationBufferMemory to retain conversation context.
    """
    try:
        # Create a conversation chain with memory
        conversation = ConversationChain(
            llm=llm,
            memory=memory,
            verbose=False
        )
        
        # Generate response
        response = conversation.predict(input=message)
        return response
    except Exception as e:
        return f"Error: {str(e)}"

@app.route('/kbanswer', methods=['POST'])
def kbanswer():
    """
    Handle knowledge base answer requests.
    Expects JSON with 'message' field.
    """
    message = request.json['message']
    
    # Call answer_from_knowledgebase(message)
    response_message = answer_from_knowledgebase(message)
        
    # Return the response as JSON
    return jsonify({'message': response_message}), 200 

@app.route('/search', methods=['POST'])
def search():
    """
    Handle knowledge base search requests.
    Expects JSON with 'message' field.
    """
    message = request.json['message']
    
    # Search the knowledgebase and generate a response
    response_message = search_knowledgebase(message)
    
    # Return the response as JSON
    return jsonify({'message': response_message}), 200

@app.route('/answer', methods=['POST'])
def answer():
    message = request.json['message']
    
    # Generate a response
    response_message = answer_as_chatbot(message)
    
    # Return the response as JSON
    return jsonify({'message': response_message}), 200

@app.route("/")
def index():
    return render_template("index.html", title="")

if __name__ == "__main__":
    # Get port from environment variable (Render sets this) or default to 8080
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port, debug=False)