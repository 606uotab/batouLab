# BatouLab Maestro

## Idée générale
BatouLab Maestro est un **orchestrateur multi-IA**.  
Il combine plusieurs modèles spécialisés afin de produire un résultat final plus fiable et sourcé.

## Ordre d’exécution
1. **Coder**  
   - Par défaut : **GPT-5** pour la génération de code.  
   - Option : **Mistral Codestral** peut remplacer GPT-5 pour un mode coding.  

2. **Research**  
   - Si le Coder détecte une information manquante ou incertaine,  
   - Appel à **Perplexity Sonar** pour rechercher des faits avec **citations et URLs**.  

3. **Refine**  
   - Le Coder intègre les résultats de Perplexity pour corriger ou compléter le code.  

4. **Review**  
   - **Claude** effectue une relecture finale : vérifie sécurité, licences, versions, propose un patch ou des notes.  

## Schéma simplifié
```text
[Utilisateur]
     |
     v
 [Coder: GPT-5 ou Codestral]
     |   (si info manquante)
     |-----------------------> [Research: Perplexity]
     |                            |
     |<---------------------------|
     v
 [Refine: Coder + résultats PPX]
     |
     v
 [Review: Claude]
     |
     v
 [Sortie finale: code + explications + sources]
```
