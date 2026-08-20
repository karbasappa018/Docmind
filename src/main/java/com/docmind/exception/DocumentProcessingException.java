package com.docmind.exception;

public class DocumentProcessingException extends  RuntimeException{

    public DocumentProcessingException(String message){
        super(message);
    }

    public DocumentProcessingException(){
        super("Error in processing documents !!");
    }

    public  DocumentProcessingException(String message, Throwable ex){
        super(message,ex);
    }

}
